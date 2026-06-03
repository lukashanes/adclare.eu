import { createHash } from "node:crypto";
import type JSZip from "jszip";

export type ExportFileContent = string | Buffer | Uint8Array;

export type ExportManifestFile = {
  path: string;
  byteSize: number;
  sha256: string;
  contentType?: string;
};

type ExportManifestInput = {
  packageType: "qr-package" | "ad-audit-package" | "workspace-control-archive";
  locale: string;
  generatedAt?: string;
  subject: Record<string, string | number | boolean | null | undefined>;
  files: ExportManifestFile[];
};

function toBuffer(content: ExportFileContent) {
  if (typeof content === "string") {
    return Buffer.from(content, "utf8");
  }

  if (Buffer.isBuffer(content)) {
    return content;
  }

  return Buffer.from(content);
}

export function exportFileHash(content: ExportFileContent) {
  return createHash("sha256").update(toBuffer(content)).digest("hex");
}

export function addExportFile(zip: JSZip, files: ExportManifestFile[], path: string, content: ExportFileContent, contentType?: string) {
  const bytes = toBuffer(content);

  zip.file(path, content);
  files.push({
    path,
    byteSize: bytes.byteLength,
    sha256: exportFileHash(bytes),
    ...(contentType ? { contentType } : {}),
  });
}

export function buildExportManifest({ packageType, locale, generatedAt = new Date().toISOString(), subject, files }: ExportManifestInput) {
  return {
    schemaVersion: "1.0",
    generatedBy: "Adclare",
    generatedAt,
    packageType,
    locale,
    subject,
    verification: {
      algorithm: "SHA-256",
      filesCovered: "All package files listed in files[]. The manifest file itself is not self-hashed.",
      note: "Recompute SHA-256 for each listed file and compare it with files[].sha256.",
    },
    files,
  };
}
