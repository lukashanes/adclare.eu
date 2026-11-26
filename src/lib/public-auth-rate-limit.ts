import { createHash } from "node:crypto";
import { checkRateLimit, requestIp } from "@/lib/rate-limit";

const windowMs = 60 * 60 * 1000;

function targetKey(target: string) {
  // The rate-limit table stores identifiers, so never put raw invite tokens or
  // email addresses in them.
  return createHash("sha256").update(target).digest("hex");
}

export async function checkPublicAuthRateLimit(request: Request, options: {
  scope: "login-link" | "signup" | "invite-accept";
  target: string;
  limit: number;
}) {
  const ip = requestIp(request);
  const target = targetKey(options.target);

  if (ip !== "unknown") {
    // Allow teams behind NAT while retaining a cap against rotating targets.
    const aggregate = await checkRateLimit({
      scope: `${options.scope}-ip`, identifier: ip, limit: options.limit * 10, windowMs,
    });
    if (!aggregate.allowed) return aggregate;
  }

  // Missing/invalid ingress headers must not merge the entire instance into a
  // single "unknown" bucket. Do not trust other client-controlled IP headers.
  return checkRateLimit({
    scope: ip === "unknown" ? `${options.scope}-target` : `${options.scope}-ip-target`,
    identifier: ip === "unknown" ? target : `${ip}:${target}`,
    limit: options.limit,
    windowMs,
  });
}
