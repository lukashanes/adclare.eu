import JSZip from "jszip";
import type { EditableAdInput } from "@/lib/workspace-types";

type CellValue = string;

type ParsedRow = {
  rowNumber: number;
  values: Map<number, CellValue>;
};

export type ImportedAdInputRow = {
  rowNumber: number;
  input: EditableAdInput;
  raw: Record<string, string>;
};

export type XlsxAdImportParseResult = {
  sheetName: string;
  headerRow: number;
  rows: ImportedAdInputRow[];
};

const maxRows = 500;
const maxXmlEntryBytes = 16 * 1024 * 1024;
const maxArchiveXmlBytes = 32 * 1024 * 1024;

async function readArchiveXml(zip: JSZip, path: string, budget: { remaining: number }) {
  const entry = zip.file(path);
  if (!entry) return null;

  // The HTTP limit bounds compressed bytes only. Count actual inflated chunks
  // rather than trusting the size declared in the ZIP directory.
  return new Promise<string>((resolve, reject) => {
    const stream = entry.nodeStream("nodebuffer");
    const chunks: Uint8Array[] = [];
    let size = 0;
    let exceeded = false;
    stream.on("data", (chunk: Buffer) => {
      if (exceeded) return;
      size += chunk.byteLength;
      if (size > maxXmlEntryBytes || chunk.byteLength > budget.remaining) {
        exceeded = true;
        stream.pause();
        if ("destroy" in stream && typeof stream.destroy === "function") stream.destroy();
        chunks.length = 0;
        reject(new Error("Excel je po rozbalení příliš velký. Maximum je 16 MB na XML soubor a 32 MB celkem."));
        return;
      }
      budget.remaining -= chunk.byteLength;
      chunks.push(chunk);
    });
    stream.on("error", reject);
    stream.on("end", () => {
      if (!exceeded) resolve(Buffer.concat(chunks).toString("utf8"));
    });
    stream.resume();
  });
}

const builtInDateNumFmtIds = new Set([
  14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56,
  57, 58,
]);

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function attributes(tag: string) {
  const result = new Map<string, string>();

  for (const match of tag.matchAll(/([\w:.-]+)="([^"]*)"/g)) {
    result.set(match[1], decodeXml(match[2]));
  }

  return result;
}

function columnIndex(cellRef: string) {
  const letters = cellRef.match(/[A-Z]+/)?.[0] ?? "A";
  let index = 0;

  for (const char of letters) {
    index = index * 26 + char.charCodeAt(0) - 64;
    if (index > 16_384) {
      throw new Error("Excel obsahuje neplatné číslo sloupce.");
    }
  }

  return index - 1;
}

function textFromXml(xml: string) {
  return [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((match) => decodeXml(match[1])).join("");
}

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\u00a0\r\n\t]+/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function readSharedStrings(xml: string | null) {
  if (!xml) {
    return [];
  }

  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) => textFromXml(match[1]));
}

function customDateFormatIds(stylesXml: string) {
  const dateIds = new Set<number>();

  for (const match of stylesXml.matchAll(/<numFmt\b[^>]*\/>/g)) {
    const attrs = attributes(match[0]);
    const id = Number(attrs.get("numFmtId"));
    const formatCode = normalizeHeader(attrs.get("formatCode") ?? "");

    if (Number.isFinite(id) && /(^|[^a-z])([dmyh]|yyyy|yy|mm|dd)([^a-z]|$)/.test(formatCode)) {
      dateIds.add(id);
    }
  }

  return dateIds;
}

function dateStyleIndexes(stylesXml: string | null) {
  if (!stylesXml) {
    return new Set<number>();
  }

  const customIds = customDateFormatIds(stylesXml);
  const xfsMatch = stylesXml.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/);
  const indexes = new Set<number>();

  if (!xfsMatch) {
    return indexes;
  }

  [...xfsMatch[1].matchAll(/<xf\b[^>]*(?:\/>|>[\s\S]*?<\/xf>)/g)].forEach((match, index) => {
    const attrs = attributes(match[0]);
    const numFmtId = Number(attrs.get("numFmtId"));

    if (builtInDateNumFmtIds.has(numFmtId) || customIds.has(numFmtId)) {
      indexes.add(index);
    }
  });

  return indexes;
}

function excelSerialDate(value: number) {
  const epoch = Date.UTC(1899, 11, 30);
  const date = new Date(epoch + value * 86_400_000);

  return date.toISOString().slice(0, 10);
}

function cellValue(cellTag: string, innerXml: string, sharedStrings: string[], dateStyles: Set<number>) {
  const attrs = attributes(cellTag);
  const type = attrs.get("t");
  const style = Number(attrs.get("s") ?? "-1");
  const raw = decodeXml(innerXml.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "");

  if (type === "s") {
    return sharedStrings[Number(raw)] ?? "";
  }

  if (type === "inlineStr") {
    return textFromXml(innerXml);
  }

  if (type === "b") {
    return raw === "1" ? "ano" : "ne";
  }

  if (!raw) {
    return "";
  }

  const numberValue = Number(raw);

  if (dateStyles.has(style) && Number.isFinite(numberValue)) {
    return excelSerialDate(numberValue);
  }

  return raw;
}

function parseRows(sheetXml: string, sharedStrings: string[], dateStyles: Set<number>) {
  const rows: ParsedRow[] = [];
  let rowIndex = 0;

  for (const rowMatch of sheetXml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    rowIndex++;
    const rowAttrs = attributes(rowMatch[1]);
    const rowNumber = Number(rowAttrs.get("r") ?? rowIndex);
    const values = new Map<number, CellValue>();

    for (const cellMatch of (rowMatch[2] ?? "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const cellAttrs = attributes(cellMatch[1]);
      const ref = cellAttrs.get("r") ?? "A1";
      values.set(columnIndex(ref), normalizeText(cellValue(cellMatch[1], cellMatch[2] ?? "", sharedStrings, dateStyles)));
    }

    if ([...values.values()].every((value) => !value)) continue;
    if (rows.length >= maxRows + 20) {
      throw new Error("Excel obsahuje příliš mnoho řádků. Maximum je 500 datových řádků na import.");
    }
    rows.push({
      rowNumber,
      values: new Map([...values].sort(([left], [right]) => left - right)),
    });
  }

  return rows;
}

function sheetInfo(workbookXml: string, relsXml: string | null) {
  const sheetMatch = workbookXml.match(/<sheet\b[^>]*name="([^"]+)"[^>]*(?:r:id|id)="([^"]+)"/);

  if (!sheetMatch || !relsXml) {
    return {
      name: "List 1",
      path: "xl/worksheets/sheet1.xml",
    };
  }

  const relationship = [...relsXml.matchAll(/<Relationship\b[^>]*\/>/g)]
    .map((match) => attributes(match[0]))
    .find((attrs) => attrs.get("Id") === sheetMatch[2]);
  const target = relationship?.get("Target") ?? "worksheets/sheet1.xml";

  return {
    name: decodeXml(sheetMatch[1]),
    path: `xl/${target.replace(/^\//, "").replace(/^xl\//, "")}`,
  };
}

const fieldAliases = {
  code: ["kod", "id reklamy", "identifikator", "cislo materialu"],
  title: ["nazev reklamy", "nazev materialu", "material"],
  candidateId: ["kandidat", "jmeno kandidata", "candidate"],
  branch: ["pobocka", "oblast", "region", "kraj", "mesto", "misto"],
  owner: ["zadavatel", "objednatel", "sponsor"],
  type: ["typ reklamy", "typ materialu", "format", "medium", "media"],
  channel: ["online offline", "kanal", "channel"],
  publicationDate: ["datum zverejneni", "datum vyveseni"],
  period: ["obdobi", "doba sireni", "casovy usek", "period"],
  distributionArea: ["oblast sireni", "misto sireni", "lokace", "uzemi"],
  payer: ["platce"],
  supplier: ["dodavatel", "agentura", "tiskarna", "vydavatel"],
  amount: ["castka za sdeleni", "naklady", "rozpocet", "cena"],
  fundingSource: ["puvod castek", "puvodu castek", "puvod financ", "zdroj financ", "financovani"],
  language: ["jazyk"],
  targeting: ["techniky cileni", "informace o pouzitych technikach cileni", "popis cileni", "cileni"],
  targetAudience: ["cilove publikum", "publikum", "audience"],
} as const;

type ImportField = keyof typeof fieldAliases;

function headerScore(row: ParsedRow) {
  const headers = [...row.values.values()].map((value) => normalizeHeader(value)).filter(Boolean);

  return (Object.keys(fieldAliases) as ImportField[]).reduce((score, field) => {
    if (headers.some((header) => fieldAliases[field].some((alias) => header.includes(alias)))) {
      return score + 1;
    }

    return score;
  }, 0);
}

function findHeaderRow(rows: ParsedRow[]) {
  const candidates = rows.slice(0, 20).map((row) => ({ row, score: headerScore(row) })).sort((left, right) => right.score - left.score);
  const best = candidates[0];

  if (!best || best.score < 2) {
    throw new Error("V Excelu se nepodařilo najít hlavičku tabulky.");
  }

  return best.row;
}

function findColumn(headers: Map<number, string>, field: ImportField) {
  const aliases = fieldAliases[field];
  for (const [index, header] of headers) {
    if (aliases.some((alias) => header === alias)) return index;
  }
  for (const [index, header] of headers) {
    if (aliases.some((alias) => header.includes(alias))) return index;
  }
  return -1;
}

function rawValue(row: ParsedRow, index: number) {
  return index >= 0 ? row.values.get(index)?.trim() ?? "" : "";
}

function isInstructionRow(values: Iterable<string>) {
  const joined = normalizeHeader([...values].join(" "));
  const markers = ["rok region co", "ciselnarada", "ciselna rada", "doplnuje", "castka s dph", "casovy usek", "nevolebni volebni", "email na vydavatele"];

  return markers.filter((marker) => joined.includes(marker)).length >= 2;
}

function isPlaceholderCode(value: string) {
  const normalized = normalizeHeader(value);

  return normalized.includes("rok region co") || normalized.includes("ciselna rada") || normalized.includes("ciselnarada");
}

function firstFilled(values: Iterable<string>) {
  return Array.from(values, (value) => value.trim()).find(Boolean) ?? "";
}

function deriveMediaType(...values: string[]) {
  const source = normalizeHeader(values.join(" "));

  if (source.includes("citylight")) return "citylight";
  if (source.includes("billboard")) return "billboard";
  if (source.includes("banner")) return "online banner";
  if (source.includes("video")) return "video";
  if (source.includes("letak")) return "leták";
  if (source.includes("plakat")) return "plakát";
  if (source.includes("social") || source.includes("facebook") || source.includes("instagram")) return "social post";

  return "";
}

function inferChannel(channel: string, type: string, title: string) {
  const source = normalizeHeader([channel, type, title].join(" "));

  return source.includes("online") || source.includes("web") || source.includes("banner") || source.includes("social") || source.includes("facebook") || source.includes("instagram")
    ? "online"
    : "offline";
}

function deriveBranch(...values: string[]) {
  for (const value of values) {
    const normalized = normalizeText(value);
    const parts = normalized.split(/[_-]/).map((part) => part.trim()).filter(Boolean);
    const candidate = parts.at(-1) ?? "";
    const candidateKey = normalizeHeader(candidate);

    if (candidate && candidate.length >= 3 && !["banner", "plakat", "letak", "video", "billboard", "citylight", "online"].includes(candidateKey)) {
      return candidate;
    }
  }

  return "";
}

function dateFromParts(day: string, month: string, year: string) {
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function normalizeDate(value: string, fallbackYear: number) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const czechDate = trimmed.match(/(\d{1,2})\.\s*(\d{1,2})\.?\s*(\d{4})?/);

  if (czechDate) {
    const year = czechDate[3] ?? trimmed.match(/\b(20\d{2})\b/)?.[1] ?? String(fallbackYear);

    return dateFromParts(czechDate[1], czechDate[2], year);
  }

  const numeric = Number(trimmed);

  if (Number.isFinite(numeric) && numeric > 25_000 && numeric < 80_000) {
    return excelSerialDate(numeric);
  }

  return "";
}

function booleanFromText(value: string) {
  const normalized = normalizeHeader(value);

  return ["ano", "yes", "true", "1", "x"].includes(normalized);
}

function normalizeTargeting(value: string) {
  const normalized = normalizeHeader(value);
  const noTargetingValues = new Set(["", "nepouzito", "not used", "ne", "no", "false", "0", "bez cileni", "netargetovano", "zadne"]);

  return noTargetingValues.has(normalized) ? "nepoužito" : normalizeText(value);
}

function buildInput(raw: Record<string, string>, fallbackYear: number): EditableAdInput {
  const code = raw.code;
  const title = raw.title || code || firstFilled([raw.type, raw.distributionArea, raw.period]);
  const type = raw.type || deriveMediaType(title, code);
  const branch = raw.branch || deriveBranch(raw.distributionArea, code, raw.title) || "Import";
  const publicationDate = normalizeDate(raw.publicationDate, fallbackYear) || normalizeDate(raw.period, fallbackYear);
  const period = raw.period || publicationDate;
  const payer = raw.payer || raw.owner;
  const owner = raw.owner || payer;
  const targeting = normalizeTargeting(raw.targeting);

  return {
    code,
    candidateId: raw.candidateId,
    title: title || `Importovaný záznam ${Date.now()}`,
    branch,
    owner,
    type,
    channel: inferChannel(raw.channel, type, title),
    publicationDate,
    period,
    distributionArea: raw.distributionArea || branch,
    payer,
    supplier: raw.supplier,
    amount: raw.amount,
    fundingSource: raw.fundingSource,
    language: raw.language || "cs",
    isTargeted: booleanFromText(raw.isTargeted || raw.targeting),
    targeting,
    targetAudience: raw.targetAudience,
  };
}

function mappedRows(rows: ParsedRow[], headerRow: ParsedRow, fallbackYear: number) {
  const headers = new Map([...headerRow.values].map(([index, value]) => [index, normalizeHeader(value)]));
  const columns = {
    code: findColumn(headers, "code"),
    title: findColumn(headers, "title"),
    candidateId: findColumn(headers, "candidateId"),
    branch: findColumn(headers, "branch"),
    owner: findColumn(headers, "owner"),
    type: findColumn(headers, "type"),
    channel: findColumn(headers, "channel"),
    publicationDate: findColumn(headers, "publicationDate"),
    period: findColumn(headers, "period"),
    distributionArea: findColumn(headers, "distributionArea"),
    payer: findColumn(headers, "payer"),
    supplier: findColumn(headers, "supplier"),
    amount: findColumn(headers, "amount"),
    fundingSource: findColumn(headers, "fundingSource"),
    language: findColumn(headers, "language"),
    targeting: findColumn(headers, "targeting"),
    targetAudience: findColumn(headers, "targetAudience"),
  };
  const sourceRows = rows.filter((row) => row.rowNumber > headerRow.rowNumber);
  const result: ImportedAdInputRow[] = [];

  for (const row of sourceRows) {
    if ([...row.values.values()].every((value) => !value.trim())) {
      continue;
    }

    const raw = {
      code: rawValue(row, columns.code),
      title: rawValue(row, columns.title),
      candidateId: rawValue(row, columns.candidateId),
      branch: rawValue(row, columns.branch),
      owner: rawValue(row, columns.owner),
      type: rawValue(row, columns.type),
      channel: rawValue(row, columns.channel),
      publicationDate: rawValue(row, columns.publicationDate),
      period: rawValue(row, columns.period),
      distributionArea: rawValue(row, columns.distributionArea),
      payer: rawValue(row, columns.payer),
      supplier: rawValue(row, columns.supplier),
      amount: rawValue(row, columns.amount),
      fundingSource: rawValue(row, columns.fundingSource),
      language: rawValue(row, columns.language),
      isTargeted: "",
      targeting: rawValue(row, columns.targeting),
      targetAudience: rawValue(row, columns.targetAudience),
    };

    if (isInstructionRow(row.values.values()) && isPlaceholderCode(raw.code || raw.title || firstFilled(row.values.values()))) {
      continue;
    }

    const input = buildInput(raw, fallbackYear);

    if ([input.code, input.title, input.candidateId, input.owner, input.payer, input.period, input.amount, input.fundingSource].every((value) => !(value ?? "").trim())) {
      continue;
    }

    if (result.length >= maxRows) {
      throw new Error("Excel obsahuje příliš mnoho řádků. Maximum je 500 datových řádků na import.");
    }
    result.push({
      rowNumber: row.rowNumber,
      raw,
      input,
    });
  }

  return result;
}

export async function parseXlsxAdImport(buffer: Buffer, fallbackYear = new Date().getFullYear()): Promise<XlsxAdImportParseResult> {
  if (buffer.subarray(0, 2).toString("utf8") !== "PK") {
    throw new Error("Soubor není XLSX. Starý formát XLS uložte v Excelu jako XLSX a nahrajte znovu.");
  }

  const zip = await JSZip.loadAsync(buffer);
  const budget = { remaining: maxArchiveXmlBytes };
  const workbookXml = await readArchiveXml(zip, "xl/workbook.xml", budget);

  if (!workbookXml) {
    throw new Error("V Excelu chybí workbook.xml.");
  }

  const relsXml = await readArchiveXml(zip, "xl/_rels/workbook.xml.rels", budget);
  const sheet = sheetInfo(workbookXml, relsXml);
  const sheetXml = await readArchiveXml(zip, sheet.path, budget);

  if (!sheetXml) {
    throw new Error("V Excelu se nepodařilo načíst první list.");
  }

  const sharedStrings = readSharedStrings(await readArchiveXml(zip, "xl/sharedStrings.xml", budget));
  const dateStyles = dateStyleIndexes(await readArchiveXml(zip, "xl/styles.xml", budget));
  const rows = parseRows(sheetXml, sharedStrings, dateStyles);
  const headerRow = findHeaderRow(rows);
  const importedRows = mappedRows(rows, headerRow, fallbackYear);

  if (importedRows.length === 0) {
    throw new Error("V Excelu nejsou žádné řádky k importu.");
  }

  return {
    sheetName: sheet.name,
    headerRow: headerRow.rowNumber,
    rows: importedRows,
  };
}
