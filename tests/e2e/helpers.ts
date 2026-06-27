import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import JSZip from "jszip";
import { expect, type APIRequestContext, type APIResponse, type Page } from "@playwright/test";
import { Pool } from "pg";

export const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for E2E tests.");
}

const pool = new Pool({ connectionString: databaseUrl });

export type WorkspacePayload = {
  tenant: { id: string; slug: string };
  user: { email: string };
  membership: { role: string; scope: string };
  permissions: Record<string, boolean>;
  branches: Array<{ id: string; name: string; archived: boolean }>;
  campaigns: Array<{ id: string; name: string; archived: boolean }>;
  candidates: Array<{ id: string; name: string; branchId: string; archived: boolean }>;
  ads: Array<{
    id: string;
    title: string;
    candidate: string;
    branch: string;
    publicUrl: string;
    workflowStatus: string;
    missing: string[];
    locked: boolean;
    version: number;
  }>;
  auditLogs: Array<{ action: string; entryHash: string; sequence: string; outcome: string }>;
};

export function randomSuffix() {
  return randomBytes(5).toString("hex");
}

function tokenHash(value: string) {
  return createHash("sha256").update(value).digest("base64url");
}

function e2eId(prefix: string) {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}

export async function closeDb() {
  await pool.end();
}

export async function queryOne<T extends Record<string, unknown>>(sql: string, values: unknown[] = []) {
  const result = await pool.query<T>(sql, values);

  return result.rows[0] ?? null;
}

export async function queryAll<T extends Record<string, unknown>>(sql: string, values: unknown[] = []) {
  const result = await pool.query<T>(sql, values);

  return result.rows;
}

export async function loginAs(page: Page, email: string) {
  const user = await queryOne<{ id: string }>('SELECT "id" FROM "users" WHERE "email" = $1', [email]);
  expect(user, `Seed user ${email} should exist`).toBeTruthy();

  const token = `e2e-${randomBytes(24).toString("base64url")}`;
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await pool.query(
    'INSERT INTO "user_sessions" ("id", "userId", "tokenHash", "expiresAt") VALUES ($1, $2, $3, $4)',
    [e2eId("sess"), user?.id, tokenHash(token), expiresAt],
  );
  await page.context().addCookies([
    {
      name: "adclare_user_session",
      value: token,
      url: baseURL,
      httpOnly: true,
      sameSite: "Strict",
      expires: Math.floor(expiresAt.getTime() / 1000),
    },
  ]);

  return user?.id ?? "";
}

export async function workspace(request: APIRequestContext) {
  const response = await request.get("/api/app/ads?locale=cs", {
    headers: { "Cache-Control": "no-store" },
  });
  expect(response.ok()).toBeTruthy();

  return (await response.json()) as WorkspacePayload;
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
}

export async function zipEntries(response: APIResponse) {
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["content-type"]).toContain("application/zip");
  const zip = await JSZip.loadAsync(await response.body());

  return Object.keys(zip.files);
}

export async function createKnownInvitation(options: { email: string; role?: string; orgUnitId?: string; candidateId?: string | null }) {
  const tenant = await queryOne<{ id: string }>('SELECT "id" FROM "tenants" WHERE "slug" = $1', ["demo-party"]);
  const inviter = await queryOne<{ id: string }>('SELECT "id" FROM "users" WHERE "email" = $1', ["admin@demo-strana.cz"]);
  expect(tenant).toBeTruthy();
  expect(inviter).toBeTruthy();

  const rawToken = `invite-e2e-${randomBytes(24).toString("base64url")}`;
  await pool.query(
    `INSERT INTO "invitations"
      ("id", "tenantId", "orgUnitId", "candidateId", "email", "role", "status", "tokenHash", "expiresAt", "invitedByUserId", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8, $9, CURRENT_TIMESTAMP)`,
    [
      e2eId("inv"),
      tenant?.id,
      options.orgUnitId || null,
      options.candidateId || null,
      options.email,
      options.role || "DESIGNER",
      tokenHash(rawToken),
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      inviter?.id,
    ],
  );

  return rawToken;
}

export async function createRoleUser(options: { email: string; name: string; role: string; orgUnitId?: string | null; candidateId?: string | null }) {
  const tenant = await queryOne<{ id: string }>('SELECT "id" FROM "tenants" WHERE "slug" = $1', ["demo-party"]);
  expect(tenant).toBeTruthy();
  const userId = e2eId("usr");
  await pool.query(
    `INSERT INTO "users" ("id", "email", "name", "updatedAt")
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
     ON CONFLICT ("email") DO UPDATE SET "name" = EXCLUDED."name", "updatedAt" = CURRENT_TIMESTAMP
     RETURNING "id"`,
    [userId, options.email, options.name],
  );
  const user = await queryOne<{ id: string }>('SELECT "id" FROM "users" WHERE "email" = $1', [options.email]);
  await pool.query(
    `INSERT INTO "tenant_memberships" ("id", "tenantId", "userId", "orgUnitId", "candidateId", "role", "status", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', CURRENT_TIMESTAMP)
     ON CONFLICT ("tenantId", "userId")
     DO UPDATE SET "orgUnitId" = EXCLUDED."orgUnitId", "candidateId" = EXCLUDED."candidateId", "role" = EXCLUDED."role", "status" = 'ACTIVE', "updatedAt" = CURRENT_TIMESTAMP`,
    [e2eId("mem"), tenant?.id, user?.id, options.orgUnitId || null, options.candidateId || null, options.role],
  );

  return user?.id ?? "";
}

function xmlEscape(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function columnName(index: number) {
  let value = "";
  let current = index + 1;

  while (current > 0) {
    const remainder = (current - 1) % 26;
    value = String.fromCharCode(65 + remainder) + value;
    current = Math.floor((current - 1) / 26);
  }

  return value;
}

export async function buildImportWorkbook(rows: string[][]) {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
      <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
    </Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
    </Relationships>`,
  );
  zip.file(
    "xl/workbook.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
    <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <sheets><sheet name="TTPA import" sheetId="1" r:id="rId1"/></sheets>
    </workbook>`,
  );
  zip.file(
    "xl/_rels/workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
    </Relationships>`,
  );
  const sheetRows = rows
    .map((row, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const cells = row
        .map((value, columnIndexValue) => {
          const ref = `${columnName(columnIndexValue)}${rowNumber}`;

          return `<c r="${ref}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
        })
        .join("");

      return `<row r="${rowNumber}">${cells}</row>`;
    })
    .join("");
  zip.file(
    "xl/worksheets/sheet1.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
    <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`,
  );

  return zip.generateAsync({ type: "nodebuffer" });
}
