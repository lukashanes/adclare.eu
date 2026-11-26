import { prisma } from "@/lib/prisma";
import { guardPublicEndpoint } from "@/lib/public-endpoint";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const checkedAt = new Date().toISOString();

  try {
    const limited = await guardPublicEndpoint(request);
    if (limited) return limited;
    await prisma.$queryRaw`SELECT 1`;

    return Response.json(
      {
        ok: true,
        service: "adclare",
        db: "ok",
        checkedAt,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        ok: false,
        service: "adclare",
        db: "error",
        checkedAt,
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
