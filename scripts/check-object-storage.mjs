#!/usr/bin/env node

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const envPath = resolve(process.cwd(), ".env");
const placeholderValues = new Set(["", "replace_with_object_storage_access_key", "replace_with_object_storage_secret"]);

function unquoteEnvValue(value) {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function loadLocalEnv() {
  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);

    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;

    if (process.env[key] === undefined) {
      process.env[key] = unquoteEnvValue(rawValue);
    }
  }
}

function env(name, fallback = "") {
  return (process.env[name] || fallback).trim();
}

function storageConfig() {
  const endpoint = env("OBJECT_STORAGE_ENDPOINT", env("S3_ENDPOINT")).replace(/\/$/, "");
  const region = env("OBJECT_STORAGE_REGION", env("S3_REGION", "fsn1"));
  const bucket = env("OBJECT_STORAGE_BUCKET", env("S3_BUCKET"));
  const accessKeyId = env("OBJECT_STORAGE_ACCESS_KEY_ID", env("S3_ACCESS_KEY_ID"));
  const secretAccessKey = env("OBJECT_STORAGE_SECRET_ACCESS_KEY", env("S3_SECRET_ACCESS_KEY"));
  const forcePathStyle = env("OBJECT_STORAGE_FORCE_PATH_STYLE", env("S3_FORCE_PATH_STYLE")) === "1";

  return {
    endpoint,
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
    forcePathStyle,
  };
}

function missingConfig(config) {
  const missing = [];

  if (!config.endpoint) {
    missing.push("OBJECT_STORAGE_ENDPOINT");
  }

  if (!config.bucket) {
    missing.push("OBJECT_STORAGE_BUCKET");
  }

  if (placeholderValues.has(config.accessKeyId)) {
    missing.push("OBJECT_STORAGE_ACCESS_KEY_ID");
  }

  if (placeholderValues.has(config.secretAccessKey)) {
    missing.push("OBJECT_STORAGE_SECRET_ACCESS_KEY");
  }

  return missing;
}

async function bodyToString(body) {
  if (!body) {
    return "";
  }

  if (typeof body.transformToString === "function") {
    return body.transformToString();
  }

  const chunks = [];

  for await (const chunk of body) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

function print(result) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

loadLocalEnv();

const config = storageConfig();
const missing = missingConfig(config);

if (missing.length > 0) {
  print({
    ok: false,
    reason: "object_storage_not_configured",
    missing,
  });
  process.exit(2);
}

const client = new S3Client({
  endpoint: config.endpoint,
  region: config.region,
  forcePathStyle: config.forcePathStyle,
  credentials: {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
  },
});

const now = new Date();
const key = `_health/adclare-object-storage-check-${now.toISOString().replace(/[:.]/g, "-")}.txt`;
const body = `adclare object storage check ${now.toISOString()}\n`;

try {
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: "text/plain; charset=utf-8",
      Metadata: {
        source: "adclare-storage-check",
      },
    }),
  );

  const response = await client.send(
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
  );
  const downloaded = await bodyToString(response.Body);

  if (downloaded !== body) {
    throw new Error("Downloaded object content did not match uploaded content.");
  }

  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
  );

  print({
    ok: true,
    provider: "S3-compatible object storage",
    endpoint: config.endpoint,
    region: config.region,
    bucket: config.bucket,
    testKey: key,
    cleanup: "deleted",
  });
} catch (error) {
  print({
    ok: false,
    reason: "object_storage_check_failed",
    endpoint: config.endpoint,
    region: config.region,
    bucket: config.bucket,
    error: {
      name: error?.name || "Error",
      message: error?.message || "Unknown object storage error.",
      statusCode: error?.$metadata?.httpStatusCode || null,
      requestId: error?.$metadata?.requestId || null,
    },
  });
  process.exit(1);
}
