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
