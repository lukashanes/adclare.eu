export const maxJsonBodyBytes = 64 * 1024;
export const multipartOverheadBytes = 64 * 1024;

export class RequestBodyError extends Error {
  constructor(message: string, readonly status: 400 | 413) {
    super(message);
    this.name = "RequestBodyError";
  }
}

async function readLimitedBody(request: Request, maxBytes: number) {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null && (!/^\d+$/.test(contentLength) || !Number.isSafeInteger(Number(contentLength)))) {
    void request.body?.cancel().catch(() => {});
    throw new RequestBodyError("Invalid Content-Length.", 400);
  }
  if (contentLength !== null && Number(contentLength) > maxBytes) {
    void request.body?.cancel().catch(() => {});
    throw new RequestBodyError("Request body is too large.", 413);
  }
  if (!request.body) return Buffer.alloc(0);

  const reader = request.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        void reader.cancel().catch(() => {});
        throw new RequestBodyError("Request body is too large.", 413);
      }
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks, total);
  } finally {
    reader.releaseLock();
  }
}

export async function readLimitedJson(request: Request): Promise<unknown> {
  const bytes = await readLimitedBody(request, maxJsonBodyBytes);
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new RequestBodyError("Invalid JSON request body.", 400);
  }
}

export async function discardLimitedBody(request: Request) {
  await readLimitedBody(request, maxJsonBodyBytes);
}

export async function readLimitedFormData(request: Request, maxFileBytes: number) {
  const bytes = await readLimitedBody(request, maxFileBytes + multipartOverheadBytes);
  try {
    return await new Response(bytes, {
      headers: { "Content-Type": request.headers.get("content-type") || "" },
    }).formData();
  } catch {
    throw new RequestBodyError("Invalid form request body.", 400);
  }
}
