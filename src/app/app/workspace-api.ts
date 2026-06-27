type ApiPayload = {
  error?: string;
};

export async function fetchApiJson<T>(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init);
  const payload = (await response.json().catch(() => ({}))) as T & ApiPayload;

  return { response, payload };
}

export function jsonRequest(method: "POST" | "PATCH", body: unknown): RequestInit {
  return {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

export function apiError(payload: ApiPayload, response: Response, fallback: string) {
  return new Error(payload.error || `${fallback} (${response.status})`);
}
