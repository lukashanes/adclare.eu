import assert from "node:assert/strict";
import { test } from "node:test";
import JSZip from "jszip";
import { loadSource } from "./load-source.mjs";

const { parseXlsxAdImport } = await loadSource("src/lib/xlsx-ad-import.ts");
const header = '<row r="1"><c r="A1" t="inlineStr"><is><t>Nazev reklamy</t></is></c><c r="B1" t="inlineStr"><is><t>Pobocka</t></is></c></row>';
const data = '<row r="2"><c r="A2" t="inlineStr"><is><t>TEST-ad</t></is></c><c r="B2" t="inlineStr"><is><t>TEST-branch</t></is></c></row>';
async function archive(sheet) {
  const zip = new JSZip();
  zip.file("xl/workbook.xml", '<workbook><sheets><sheet name="TEST" r:id="rId1"/></sheets></workbook>');
  zip.file("xl/worksheets/sheet1.xml", `<worksheet><sheetData>${sheet}</sheetData></worksheet>`);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

test("a normal TEST workbook still imports", async () => {
  const result = await parseXlsxAdImport(await archive(header + data));
  assert.equal(result.rows[0].input.title, "TEST-ad");
});

test("a small compressed XLSX cannot inflate an unbounded XML entry", async () => {
  const bytes = await archive(header + data + " ".repeat(17 * 1024 * 1024));
  assert.ok(bytes.length < 100 * 1024);
  await assert.rejects(parseXlsxAdImport(bytes), /rozbalení/);
});

test("invalid Excel column references cannot allocate massive sparse arrays", async () => {
  const invalid = data.replace('r="B2"', 'r="ZZZZZ2"');
  await assert.rejects(parseXlsxAdImport(await archive(header + invalid)), /sloupce/);
});

test("valid far-right columns stay sparse while preserving imported values", async (t) => {
  const bytes = await archive(header.replaceAll('r="A1"', 'r="XFC1"').replaceAll('r="B1"', 'r="XFD1"') +
    data.replaceAll('r="A2"', 'r="XFC2"').replaceAll('r="B2"', 'r="XFD2"'));
  const from = Array.from;
  t.mock.method(Array, "from", function (value, ...args) {
    assert.ok(value?.length !== 16_384, "a sparse row must not allocate every empty column");
    return from.call(this, value, ...args);
  });
  const result = await parseXlsxAdImport(bytes);
  assert.equal(result.rows[0].input.title, "TEST-ad");
  assert.equal(result.rows[0].input.branch, "TEST-branch");
});

test("exceeding inflated XML limits destroys the decompression output stream", async (t) => {
  const bytes = await archive(header + data + " ".repeat(17 * 1024 * 1024));
  const file = JSZip.prototype.file;
  const streams = [];
  t.mock.method(JSZip.prototype, "file", function (...args) {
    const entry = file.apply(this, args);
    if (entry && args.length === 1 && typeof args[0] === "string") {
      const nodeStream = entry.nodeStream;
      entry.nodeStream = function (...options) { const stream = nodeStream.apply(this, options); streams.push(stream); return stream; };
    }
    return entry;
  });
  await assert.rejects(parseXlsxAdImport(bytes), /rozbalení/);
  assert.equal(streams.at(-1).destroyed, true);
});

test("the XML budget is shared across sheet, strings and styles", async () => {
  const zip = await JSZip.loadAsync(await archive(header + data + " ".repeat(11 * 1024 * 1024)));
  zip.file("xl/sharedStrings.xml", `<sst>${" ".repeat(11 * 1024 * 1024)}</sst>`);
  zip.file("xl/styles.xml", `<styleSheet>${" ".repeat(11 * 1024 * 1024)}</styleSheet>`);
  await assert.rejects(parseXlsxAdImport(await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" })), /32 MB celkem/);
});

test("a header in the twentieth row preserves the 500-data-row limit", async () => {
  const preamble = Array.from({ length: 19 }, (_, i) => `<row r="${i + 1}"><c r="A${i + 1}"><v>0</v></c></row>`).join("");
  const header20 = header.replaceAll('r="1"', 'r="20"').replaceAll('r="A1"', 'r="A20"').replaceAll('r="B1"', 'r="B20"');
  const rows = Array.from({ length: 501 }, (_, i) => data.replaceAll('r="2"', `r="${i + 21}"`).replaceAll('r="A2"', `r="A${i + 21}"`).replaceAll('r="B2"', `r="B${i + 21}"`)).join("");
  const result = await parseXlsxAdImport(await archive(preamble + header20 + rows));
  assert.equal(result.headerRow, 20);
  assert.equal(result.rows.length, 500);
  assert.equal(result.rows.at(-1).rowNumber, 520);
});
