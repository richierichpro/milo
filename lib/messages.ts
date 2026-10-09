import type { CandidatePool } from "./gather";
import type { CallLogEntry, Itinerary } from "./types";

/** Lines streamed by /api/plan and /api/chat. */
export type StreamMessage =
  | { type: "progress"; text: string }
  | { type: "plan"; itinerary: Itinerary; receipts: CallLogEntry[]; pool: CandidatePool }
  | { type: "message"; text: string }
  | { type: "error"; message: string };
