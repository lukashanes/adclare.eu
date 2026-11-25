import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { loadSource } from "./load-source.mjs";

const { requestIp } = await loadSource("src/lib/rate-limit.ts", { "@/lib/prisma": { prisma: {} } });

test("untrusted CF and forwarded headers cannot change the proxy client IP", () => {
  for (const spoofed of ["198.51.100.1", "198.51.100.2"]) {
    assert.equal(requestIp(new Request("https://adclare.test", { headers: {
      "x-real-ip": "192.0.2.1", "cf-connecting-ip": spoofed, "x-forwarded-for": `${spoofed}, 192.0.2.1`,
    } })), "192.0.2.1");
  }
  assert.equal(requestIp(new Request("https://adclare.test", { headers: { "cf-connecting-ip": "198.51.100.1" } })), "unknown");
  assert.equal(requestIp(new Request("https://adclare.test", { headers: { "x-real-ip": "not an IP" } })), "unknown");
  assert.equal(requestIp(new Request("https://adclare.test", { headers: { "x-real-ip": "2001:db8::1" } })), "2001:db8::1");
});

test("both proxy templates overwrite client IP headers at the trusted boundary", async () => {
  const nginx = await readFile("deploy/nginx/adclare.conf.example", "utf8");
  const caddy = await readFile("deploy/caddy/Caddyfile", "utf8");
  assert.match(nginx, /proxy_set_header CF-Connecting-IP "";/);
  assert.match(nginx, /proxy_set_header X-Forwarded-For \$remote_addr;/);
  assert.match(caddy, /header_up X-Real-IP \{remote_host\}/);
  assert.match(caddy, /header_up -CF-Connecting-IP/);
});
