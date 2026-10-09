import type { CandidatePool } from "./gather";
import type { CallLogEntry, Itinerary, SquadMatch } from "./types";

/** Lines streamed by /api/plan and /api/chat. */
export type StreamMessage =
  | { type: "progress"; text: string }
  | { type: "plan"; itinerary: Itinerary; receipts: CallLogEntry[]; pool: CandidatePool }
  | { type: "destinations"; match: SquadMatch; receipts: CallLogEntry[] }
  | { type: "message"; text: string }
  | { type: "error"; message: string };
