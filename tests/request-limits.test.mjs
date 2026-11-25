import assert from "node:assert/strict";
import { test } from "node:test";
import { loadSource } from "./load-source.mjs";

const { readLimitedJson, readLimitedFormData, maxJsonBodyBytes, multipartOverheadBytes } =
  await loadSource("src/lib/request-limits.ts");

function post(body, headers = {}) {
  return new Request("https://adclare.test/api/TEST", { method: "POST", body, headers, duplex: "half" });
}

test("valid UTF-8 JSON and the exact byte boundary are accepted", async () => {
  const body = JSON.stringify({ name: "TEST-Žluťoučký kůň" });
  assert.deepEqual(await readLimitedJson(post(body)), JSON.parse(body));
  const boundary = JSON.stringify("x".repeat(maxJsonBodyBytes - 2));
  assert.equal((await readLimitedJson(post(boundary))).length, maxJsonBodyBytes - 2);
});

test("an excessive Content-Length is rejected without pulling the body", async () => {
  let reads = 0;
  const stream = new ReadableStream({ pull() { reads++; } }, { highWaterMark: 0 });
  await assert.rejects(readLimitedJson(post(stream, { "Content-Length": String(maxJsonBodyBytes + 1) })), { status: 413 });
  assert.equal(reads, 0);
});

test("actual bytes are bounded even when Content-Length is understated", async () => {
  await assert.rejects(readLimitedJson(post("x".repeat(maxJsonBodyBytes + 1), { "Content-Length": "1" })), { status: 413 });
});

test("invalid Content-Length and empty JSON are client errors", async () => {
  for (const length of ["-1", "abc", "1.5", "9007199254740992"]) {
    await assert.rejects(readLimitedJson(post("{}", { "Content-Length": length })), { status: 400 });
  }
  await assert.rejects(readLimitedJson(post("")), { status: 400 });
});

test("multipart parsing accepts text and files under the total limit", async () => {
  const data = new FormData();
  data.set("name", "TEST-upload");
  data.set("file", new File(["%PDF-1.7\nTEST"], "TEST.pdf", { type: "application/pdf" }));
  const parsed = await readLimitedFormData(post(data), 1024);
  assert.equal(parsed.get("name"), "TEST-upload");
  assert.equal(await parsed.get("file").text(), "%PDF-1.7\nTEST");
});

test("multipart is bounded before parsing, including unexpected fields", async () => {
  const data = new FormData();
  data.set("unexpected", new File(["x".repeat(multipartOverheadBytes + 1025)], "TEST-extra.txt"));
  const encoded = post(data);
  const contentType = encoded.headers.get("content-type");
  await assert.rejects(readLimitedFormData(post(await encoded.arrayBuffer(), { "Content-Type": contentType }), 1024), { status: 413 });
});

test("malformed multipart is a client error", async () => {
  await assert.rejects(readLimitedFormData(post("TEST-broken", { "Content-Type": "multipart/form-data" }), 1024), { status: 400 });
});
