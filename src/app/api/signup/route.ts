import { readLimitedJson } from "@/lib/request-limits";
import { isSameOriginRequest } from "@/lib/request-security";
import { guardPublicEndpoint } from "@/lib/public-endpoint";
import { receivePublicSubmission, markSubmissionProcessed } from "@/lib/public-submission";
import { parseSignupInput, validationErrorResponse } from "@/lib/request-validation";
import { createSignupWorkspace } from "@/lib/signup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const limited = await guardPublicEndpoint(request);
  if (limited) return limited;
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const body = parseSignupInput(await readLimitedJson(request));
    const submission = await receivePublicSubmission(request, "SIGNUP", body);
    if (!submission.verified) return Response.json({ ok: true, held: true });

    const signup = await createSignupWorkspace({
      organizationName: body.organizationName,
      name: body.name,
      email: body.email,
    });

    await markSubmissionProcessed(submission.id);
    return Response.json(signup);
  } catch (error) {
    const validation = validationErrorResponse(error);

    if (validation) {
      return validation;
    }

    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : "Signup failed." }, { status: 400 });
  }
}
