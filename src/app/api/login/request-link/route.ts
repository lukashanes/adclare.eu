import { readLimitedJson } from "@/lib/request-limits";
import { isSameOriginRequest } from "@/lib/request-security";
import { requestAppLoginLink } from "@/lib/app-auth";
import { guardPublicEndpoint } from "@/lib/public-endpoint";
import { receivePublicSubmission, markSubmissionProcessed } from "@/lib/public-submission";
import { parseLoginRequestInput, validationErrorResponse } from "@/lib/request-validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const limited = await guardPublicEndpoint(request);
  if (limited) return limited;
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const body = parseLoginRequestInput(await readLimitedJson(request));
    const submission = await receivePublicSubmission(request, "LOGIN", body);
    if (!submission.verified) return Response.json({ ok: true, held: true });

    await requestAppLoginLink(body.email);
    await markSubmissionProcessed(submission.id);
    return Response.json({ ok: true });
  } catch (error) {
    const validation = validationErrorResponse(error);

    if (validation) {
      return validation;
    }

    console.error(error);
    return Response.json({ error: "Login link request failed." }, { status: 500 });
  }
}
