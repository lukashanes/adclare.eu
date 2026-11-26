import { readLimitedJson } from "@/lib/request-limits";
import { isSameOriginRequest } from "@/lib/request-security";
import { acceptInvitation, normalizeLocale } from "@/lib/workspace-db";
import { guardPublicEndpoint } from "@/lib/public-endpoint";
import { receivePublicSubmission, markSubmissionProcessed } from "@/lib/public-submission";
import { parseInviteAcceptInput, validationErrorResponse } from "@/lib/request-validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const limited = await guardPublicEndpoint(request);
  if (limited) return limited;
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  const { token } = await context.params;
  const locale = normalizeLocale(new URL(request.url).searchParams.get("locale"));

  try {
    const body = parseInviteAcceptInput(await readLimitedJson(request));
    const decodedToken = decodeURIComponent(token);
    const submission = await receivePublicSubmission(request, "INVITE_ACCEPT", body, decodedToken);
    if (!submission.verified) return Response.json({ ok: true, held: true });

    const notice = await acceptInvitation(decodedToken, body.name, locale);

    if (!notice) {
      return Response.json({ error: "Invitation cannot be accepted." }, { status: 409 });
    }

    await markSubmissionProcessed(submission.id);
    return Response.json({ invitation: notice });
  } catch (error) {
    const validation = validationErrorResponse(error);

    if (validation) {
      return validation;
    }

    console.error(error);
    return Response.json({ error: "Invitation accept failed." }, { status: 400 });
  }
}
