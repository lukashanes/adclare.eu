import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { test } from "node:test";
import { loadSource } from "./load-source.mjs";

test("asset storage verifies content signatures before writing", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "TEST-adclare-assets-"));
  const previous = { driver: process.env.ADCLARE_STORAGE_DRIVER, root: process.env.ADCLARE_LOCAL_STORAGE_DIR };
  process.env.ADCLARE_STORAGE_DRIVER = "local";
  process.env.ADCLARE_LOCAL_STORAGE_DIR = directory;
  t.after(async () => {
    if (previous.driver === undefined) delete process.env.ADCLARE_STORAGE_DRIVER; else process.env.ADCLARE_STORAGE_DRIVER = previous.driver;
    if (previous.root === undefined) delete process.env.ADCLARE_LOCAL_STORAGE_DIR; else process.env.ADCLARE_LOCAL_STORAGE_DIR = previous.root;
    assert.ok(resolve(directory).startsWith(`${resolve(tmpdir())}${sep}TEST-adclare-assets-`));
    await rm(directory, { recursive: true, force: true });
  });
  const { uploadAdAssetObject } = await loadSource("src/lib/object-storage.ts");
  const target = { tenantSlug: "TEST-tenant", adCode: "TEST-ad" };
  await assert.rejects(uploadAdAssetObject({
    ...target, file: new File(["<html>TEST-fake PDF</html>"], "TEST-fake.pdf", { type: "application/pdf" }),
  }), /povolenému formátu/);
  assert.deepEqual(await readdir(directory), []);
  const bytes = "%PDF-1.7\nTEST-file";
  const object = await uploadAdAssetObject({
    ...target, file: new File([bytes], "TEST-valid.pdf", { type: "application/pdf" }),
  });
  assert.equal(object.contentType, "application/pdf");
  assert.equal(await readFile(join(directory, object.key), "utf8"), bytes);
});
