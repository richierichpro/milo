/** Server: a Response that streams one JSON object per line. */
export function ndjsonResponse<T>(run: (send: (msg: T) => void) => Promise<void>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (msg: T) => controller.enqueue(encoder.encode(JSON.stringify(msg) + "\n"));
      try {
        await run(send);
      } catch (err) {
        send({ type: "error", message: (err as Error).message } as T);
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}

/** Client: read an NDJSON response, calling onMessage for each line. */
export async function readNdjson<T>(res: Response, onMessage: (msg: T) => void): Promise<void> {
  if (!res.body) throw new Error(`Empty response (${res.status})`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) if (line.trim()) onMessage(JSON.parse(line) as T);
    if (done) break;
  }
  if (buffer.trim()) onMessage(JSON.parse(buffer) as T);
}
