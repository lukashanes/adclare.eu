import { isIP } from "node:net";

// The ingress proxy must overwrite X-Real-IP and be the only route to the app.
// CF-Connecting-IP and X-Forwarded-For may originate with an untrusted client.
export function requestIp(request: Request) {
  const ip = request.headers.get("x-real-ip")?.trim() ?? "";
  return isIP(ip) ? ip : "unknown";
}
