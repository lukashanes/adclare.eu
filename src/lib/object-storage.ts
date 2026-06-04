import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client, type GetObjectCommandOutput } from "@aws-sdk/client-s3";

const placeholderValues = new Set(["", "replace_with_object_storage_access_key", "replace_with_object_storage_secret"]);
const defaultMaxUploadBytes = 50 * 1024 * 1024;
const localStorageProvider = "local";
const s3StorageProvider = "s3";
const allowedContentTypes = new Set([
  "application/pdf",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/webp",
  "video/mp4",
  "video/quicktime",
]);

type UploadTarget = {
  tenantSlug: string;
  adCode: string;
  file: File;
};

type StoredObject = {
  provider: string;
  bucket: string;
  key: string;
  publicUrl: string;
  fileName: string;
  originalName: string;
  contentType: string;
  byteSize: number;
  checksumSha256: string;
};

export type StoredObjectDownload = {
  bytes: Buffer;
  contentType: string;
  byteSize: number;
};

function storageEndpoint() {
  return (process.env.OBJECT_STORAGE_ENDPOINT || process.env.S3_ENDPOINT || "").trim().replace(/\/$/, "");
}

function storageRegion() {
  return (process.env.OBJECT_STORAGE_REGION || process.env.S3_REGION || "fsn1").trim();
}

function storageBucket() {
  return (process.env.OBJECT_STORAGE_BUCKET || process.env.S3_BUCKET || "").trim();
}

function storageAccessKeyId() {
  return (process.env.OBJECT_STORAGE_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID || "").trim();
}

function storageSecretAccessKey() {
  return (process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY || "").trim();
}

function storagePublicBaseUrl() {
  return (process.env.OBJECT_STORAGE_PUBLIC_BASE_URL || "").trim().replace(/\/$/, "");
}

function configuredStorageDriver() {
  return (process.env.ADCLARE_STORAGE_DRIVER || process.env.OBJECT_STORAGE_DRIVER || "").trim().toLowerCase();
}

function localStorageRoot() {
  return (process.env.ADCLARE_LOCAL_STORAGE_DIR || process.env.LOCAL_UPLOAD_DIR || (process.env.NODE_ENV === "production" ? "/data/uploads" : ".data/uploads")).trim();
}

function forcePathStyle() {
  return process.env.OBJECT_STORAGE_FORCE_PATH_STYLE === "1" || process.env.S3_FORCE_PATH_STYLE === "1";
}

export function maxUploadBytes() {
  const configured = Number(process.env.MAX_AD_ASSET_UPLOAD_MB || "");

  if (Number.isFinite(configured) && configured > 0) {
    return Math.round(configured * 1024 * 1024);
  }

  return defaultMaxUploadBytes;
}

export function objectStorageStatus() {
  const driver = assetStorageDriver();
  const configured = isAssetStorageAvailable();

  return {
    configured,
    provider: driver === s3StorageProvider ? "Hetzner Object Storage / S3" : "local file storage",
    bucket: driver === s3StorageProvider && configured ? storageBucket() : "",
    maxUploadSizeMb: Math.round(maxUploadBytes() / 1024 / 1024),
  };
}

export function assetStorageDriver() {
  const configured = configuredStorageDriver();

  if (configured === s3StorageProvider || configured === "object-storage" || configured === "object_storage") {
    return s3StorageProvider;
  }

  if (configured === localStorageProvider || configured === "filesystem" || configured === "fs") {
    return localStorageProvider;
  }

  return isObjectStorageConfigured() ? s3StorageProvider : localStorageProvider;
}

export function isAssetStorageAvailable() {
  const driver = assetStorageDriver();

  return driver === localStorageProvider || isObjectStorageConfigured();
}

export function isObjectStorageConfigured() {
  return Boolean(
    storageEndpoint() &&
      storageBucket() &&
      !placeholderValues.has(storageAccessKeyId()) &&
      !placeholderValues.has(storageSecretAccessKey()),
  );
}

function storageClient() {
  if (!isObjectStorageConfigured()) {
    throw new Error("Object storage is not configured.");
  }

  return new S3Client({
    endpoint: storageEndpoint(),
    region: storageRegion(),
    forcePathStyle: forcePathStyle(),
    credentials: {
      accessKeyId: storageAccessKeyId(),
      secretAccessKey: storageSecretAccessKey(),
    },
  });
}

function localObjectPath(key: string) {
  const root = resolve(localStorageRoot());
  const target = resolve(root, key);

  if (target !== root && !target.startsWith(`${root}${sep}`)) {
    throw new Error("Invalid local storage key.");
  }

  return target;
}

function safeSegment(value: string, fallback: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/(^[.-]+|[.-]+$)/g, "")
      .slice(0, 120) || fallback
  );
}

function safeFileName(value: string) {
  const normalized = value.trim().replace(/[/\\]/g, "-");
  const fallback = "asset";
  const dotIndex = normalized.lastIndexOf(".");

  if (dotIndex <= 0 || dotIndex === normalized.length - 1) {
    return safeSegment(normalized, fallback);
  }

  const basename = safeSegment(normalized.slice(0, dotIndex), fallback);
  const extension = safeSegment(normalized.slice(dotIndex + 1), "").slice(0, 16);
  return extension ? `${basename}.${extension}` : basename;
}

function publicObjectUrl(key: string) {
  const base = storagePublicBaseUrl();

  if (!base) {
    return "";
  }

  return `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

function assertUploadAllowed(file: File) {
  if (file.size <= 0) {
    throw new Error("Soubor je prázdný.");
  }

  if (file.size > maxUploadBytes()) {
    throw new Error(`Soubor je větší než povolený limit ${Math.round(maxUploadBytes() / 1024 / 1024)} MB.`);
  }

  if (file.type && !allowedContentTypes.has(file.type)) {
    throw new Error("Tento typ souboru zatím není povolený. Nahrajte PDF, obrázek nebo MP4 video.");
  }
}

async function bodyToBuffer(body: GetObjectCommandOutput["Body"]) {
  if (!body) {
    return Buffer.alloc(0);
  }

  if (typeof body.transformToByteArray === "function") {
    return Buffer.from(await body.transformToByteArray());
  }

  const chunks: Buffer[] = [];

  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

export async function uploadAdAssetObject({ tenantSlug, adCode, file }: UploadTarget): Promise<StoredObject> {
  assertUploadAllowed(file);

  const driver = assetStorageDriver();
  const bucket = driver === s3StorageProvider ? storageBucket() : "";
  const fileName = safeFileName(file.name || "asset");
  const bytes = Buffer.from(await file.arrayBuffer());
  const checksumSha256 = createHash("sha256").update(bytes).digest("hex");
  const key = [
    "tenants",
    safeSegment(tenantSlug, "tenant"),
    "ads",
    safeSegment(adCode, "ad"),
    `${new Date().toISOString().slice(0, 10)}-${randomBytes(8).toString("hex")}-${fileName}`,
  ].join("/");

  if (driver === localStorageProvider) {
    const target = localObjectPath(key);

    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, bytes, { flag: "wx" });

    return {
      provider: localStorageProvider,
      bucket,
      key,
      publicUrl: "",
      fileName,
      originalName: file.name || fileName,
      contentType: file.type || "application/octet-stream",
      byteSize: file.size,
      checksumSha256,
    };
  }

  await storageClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: bytes,
      ContentType: file.type || "application/octet-stream",
      Metadata: {
        "ad-code": adCode,
        "tenant-slug": tenantSlug,
        "original-name": file.name || fileName,
        "sha256": checksumSha256,
      },
    }),
  );

  return {
    provider: s3StorageProvider,
    bucket,
    key,
    publicUrl: publicObjectUrl(key),
    fileName,
    originalName: file.name || fileName,
    contentType: file.type || "application/octet-stream",
    byteSize: file.size,
    checksumSha256,
  };
}

export async function downloadAdAssetObject(provider: string, bucket: string, key: string): Promise<StoredObjectDownload> {
  if (provider === localStorageProvider) {
    const bytes = await readFile(localObjectPath(key));

    return {
      bytes,
      contentType: "application/octet-stream",
      byteSize: bytes.length,
    };
  }

  const response = await storageClient().send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
  const bytes = await bodyToBuffer(response.Body);

  return {
    bytes,
    contentType: response.ContentType || "application/octet-stream",
    byteSize: Number(response.ContentLength || bytes.length),
  };
}
