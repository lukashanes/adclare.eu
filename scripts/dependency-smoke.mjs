import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

test("Next.js can load its native image dependency and resize supported image formats", async (t) => {
  const require = createRequire(import.meta.url);
  const requireNext = createRequire(require.resolve("next/package.json"));
  const sharp = requireNext("sharp");
  const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#123456" } }).png().toBuffer();

  for (const format of ["jpeg", "webp", "avif"]) {
    await t.test(format, async () => {
      const image = await sharp(png).resize(2, 2).toFormat(format).toBuffer();
      const metadata = await sharp(image).metadata();
      assert.equal(metadata.width, 2);
      assert.equal(metadata.height, 2);
      // AVIF is reported as HEIF by libvips.
      assert.equal(metadata.format, format === "avif" ? "heif" : format);
    });
  }
});
