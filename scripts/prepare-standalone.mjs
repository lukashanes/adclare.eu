#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const standaloneDir = resolve(root, ".next/standalone");
const standaloneNextDir = resolve(standaloneDir, ".next");
const sourceStaticDir = resolve(root, ".next/static");
const targetStaticDir = resolve(standaloneNextDir, "static");
const sourcePublicDir = resolve(root, "public");
const targetPublicDir = resolve(standaloneDir, "public");

if (!existsSync(standaloneDir)) {
  console.error("Standalone output is missing. Run `next build` before preparing standalone assets.");
  process.exit(1);
}

if (!existsSync(sourceStaticDir)) {
  console.error("Next static output is missing. Run `next build` before preparing standalone assets.");
  process.exit(1);
}

mkdirSync(standaloneNextDir, { recursive: true });
rmSync(targetStaticDir, { recursive: true, force: true });
cpSync(sourceStaticDir, targetStaticDir, { recursive: true });

if (existsSync(sourcePublicDir)) {
  rmSync(targetPublicDir, { recursive: true, force: true });
  cpSync(sourcePublicDir, targetPublicDir, { recursive: true });
}

console.log("Standalone assets prepared.");
