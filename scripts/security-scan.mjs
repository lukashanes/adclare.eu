#!/usr/bin/env node

import { execSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";

const maxFileBytes = 1024 * 1024;
const skippedFiles = new Set(["LICENSE", "package-lock.json"]);
const skippedExtensions = new Set([".ico"]);

const patterns = [
  {
    id: "private-key",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |)?PRIVATE KEY-----/gi,
  },
  {
    id: "stripe-secret-key",
    pattern: /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/g,
  },
  {
    id: "stripe-webhook-secret",
    pattern: /\bwhsec_[A-Za-z0-9]{16,}\b/g,
  },
  {
    id: "openai-api-key",
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    id: "github-token",
    pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/g,
  },
  {
    id: "aws-access-key",
    pattern: /\bAKIA[0-9A-Z]{16}\b/g,
  },
  {
    id: "cloudflare-api-token",
    pattern: /\bCFPAT-[A-Za-z0-9_-]{20,}\b/g,
  },
];

function trackedFiles() {
  return execSync("git ls-files -z", { encoding: "buffer" }).toString("utf8").split("\0").filter(Boolean);
}

function extension(path) {
  const dot = path.lastIndexOf(".");

  return dot >= 0 ? path.slice(dot) : "";
}

function mask(value) {
  if (value.length <= 12) {
    return "[masked]";
  }

  return `${value.slice(0, 4)}...[${value.length}]...${value.slice(-4)}`;
}

function isPlaceholderLine(line) {
  return /replace_|placeholder|example|dummy|your_|process\.env|env\(|\$\{|set [A-Z0-9_]+|optional/i.test(line);
}

const findings = [];

for (const file of trackedFiles()) {
  if (skippedFiles.has(file) || skippedExtensions.has(extension(file))) {
    continue;
  }

  const stat = statSync(file);

  if (stat.size > maxFileBytes) {
    continue;
  }

  let content = "";

  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  if (content.includes("\0")) {
    continue;
  }

  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (isPlaceholderLine(line)) {
      return;
    }

    patterns.forEach(({ id, pattern }) => {
      pattern.lastIndex = 0;

      for (const match of line.matchAll(pattern)) {
        findings.push({
          file,
          line: index + 1,
          type: id,
          sample: mask(match[0]),
        });
      }
    });
  });
}

if (findings.length > 0) {
  console.error("Potential secrets found in tracked files:");
  findings.forEach((finding) => {
    console.error(`- ${finding.file}:${finding.line} ${finding.type} ${finding.sample}`);
  });
  process.exit(1);
}

console.log("Security scan passed. No common secret patterns found in tracked files.");
