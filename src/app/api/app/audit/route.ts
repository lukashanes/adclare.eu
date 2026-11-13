import { getAppSession } from "@/lib/app-auth";
import {
  AuditEventsQueryValidationError,
  getAppAuditEvents,
  parseAuditEventsQuery,
} from "@/lib/workspace/services/audit-events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function privateJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");

  return Response.json(body, {
    ...init,
    headers,
  });
}

export async function GET(request: Request) {
  const session = await getAppSession(request.headers.get("cookie"));

  if (!session) {
    return privateJson({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const query = parseAuditEventsQuery(new URL(request.url).searchParams);
    const result = await getAppAuditEvents(session.userId, query);

    if (!result) {
      return privateJson({ error: "Nemáte přístup k auditnímu logu." }, { status: 403 });
    }

    return privateJson(result);
  } catch (error) {
    if (error instanceof AuditEventsQueryValidationError) {
      return privateJson({ error: error.message, issues: error.issues }, { status: 400 });
    }

    console.error(error);
    return privateJson({ error: "Auditní události se nepodařilo načíst." }, { status: 500 });
  }
}
