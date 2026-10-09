import { editPlan } from "@/lib/agent";
import type { CandidatePool } from "@/lib/gather";
import type { StreamMessage } from "@/lib/messages";
import { ndjsonResponse } from "@/lib/ndjson";
import type { Itinerary } from "@/lib/types";

export const runtime = "nodejs";

type Body = { itinerary?: Itinerary; pool?: CandidatePool; message?: string };

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  const message = String(body?.message ?? "").trim().slice(0, 500);
  if (!body?.itinerary || !body.pool || !message) return Response.json({ error: "Send the current plan and a message." }, { status: 400 });

  return ndjsonResponse<StreamMessage>(async (send) => {
    const result = await editPlan(body.itinerary!, body.pool!, message, (text) => send({ type: "progress", text }));
    send({ type: "plan", itinerary: result.itinerary, receipts: result.receipts, pool: result.pool });
    send({ type: "message", text: result.text });
  });
}
