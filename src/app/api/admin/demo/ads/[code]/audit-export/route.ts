import { prepareDemoAuditExport } from "@/lib/admin-demo-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;

  try {
    const exportReady = await prepareDemoAuditExport(decodeURIComponent(code));

    if (!exportReady) {
      return Response.json({ error: "Ad not found." }, { status: 404 });
    }

    return Response.json({ exportReady });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Audit export failed." }, { status: 503 });
  }
}
