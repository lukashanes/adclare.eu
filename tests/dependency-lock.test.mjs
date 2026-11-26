import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const lock = JSON.parse(await readFile(new URL("../package-lock.json", import.meta.url), "utf8"));

test("the lockfile matches the application manifest", () => {
  for (const field of ["dependencies", "devDependencies"]) {
    assert.deepEqual(lock.packages[""][field], manifest[field], field);
  }
});

test("the lockfile retains every optional dependency, including other platforms", () => {
  for (const [location, dependency] of Object.entries(lock.packages)) {
    for (const name of Object.keys(dependency.optionalDependencies ?? {})) {
      let parent = location;
      let found = false;
      while (true) {
        const key = parent ? `${parent}/node_modules/${name}` : `node_modules/${name}`;
        if (lock.packages[key]) {
          found = true;
          break;
        }
        if (!parent) break;
        const index = parent.lastIndexOf("/node_modules/");
        parent = index < 0 ? "" : parent.slice(0, index);
      }
      assert.ok(found, `${location || "root"} is missing optional dependency ${name}`);
    }
  }
});

test("Linux glibc and musl build binaries have pinned versions and integrity", () => {
  for (const name of [
    "@next/swc-linux-x64-gnu", "@next/swc-linux-x64-musl",
    "@tailwindcss/oxide-linux-x64-gnu", "@tailwindcss/oxide-linux-x64-musl",
    "@img/sharp-linux-x64", "@img/sharp-linuxmusl-x64",
    "@img/sharp-libvips-linux-x64", "@img/sharp-libvips-linuxmusl-x64",
    "@esbuild/linux-x64",
  ]) {
    const dependency = lock.packages[`node_modules/${name}`];
    assert.ok(dependency?.version && dependency.integrity, name);
    assert.ok(dependency.os?.includes("linux"), name);
    assert.ok(dependency.cpu?.includes("x64"), name);
  }
});

