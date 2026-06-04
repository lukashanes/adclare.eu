import { isSameOriginRequest } from "@/lib/admin-auth";
import { getAppSession } from "@/lib/app-auth";
import { normalizeLocale, updateAppBranch } from "@/lib/admin-demo-db";
import { parseAppBranchUpdateInput, validationErrorResponse } from "@/lib/request-validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function unauthorized() {
  return Response.json({ error: "Unauthorized." }, { status: 401 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAppSession(request.headers.get("cookie"));

  if (!session) {
    return unauthorized();
  }

  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await context.params;
  const locale = normalizeLocale(new URL(request.url).searchParams.get("locale"));

  try {
    const input = parseAppBranchUpdateInput(await request.json());
    const branch = await updateAppBranch(session.userId, decodeURIComponent(id), input, locale);

    if (!branch) {
      return Response.json({ error: "Pobočku nemůžete upravit nebo neexistuje." }, { status: 404 });
    }

    return Response.json({ branch });
  } catch (error) {
    const validation = validationErrorResponse(error);

    if (validation) {
      return validation;
    }

    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : "Pobočku se nepodařilo uložit." }, { status: 400 });
  }
}
