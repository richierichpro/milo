import { dayLabel } from "@/lib/format";
import { formatINR } from "@/lib/money";
import type { TripInput } from "@/lib/types";

/** "4 friends · Goa · 20–23 Nov · ₹20,000 each" with an Edit link. */
export function TripSummary({ trip, onEdit }: { trip: TripInput; onEdit: () => void }) {
  const start = dayLabel(trip.startDate).split(" ");
  const end = dayLabel(trip.endDate).split(" ");
  // "Fri 20 Nov" → "20–23 Nov", or "28 Nov–2 Dec" across months.
  const dates = start[2] === end[2] ? `${start[1]}–${end[1]} ${end[2]}` : `${start[1]} ${start[2]}–${end[1]} ${end[2]}`;
  const parts = [
    `${trip.squad.length} friend${trip.squad.length === 1 ? "" : "s"}`,
    trip.destination || "anywhere",
    dates,
    trip.budgetPerPerson ? `${formatINR(trip.budgetPerPerson)} each` : "",
  ].filter(Boolean);
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white px-3 py-2 text-sm">
      <span className="truncate">{parts.join(" · ")}</span>
      <button type="button" onClick={onEdit} className="shrink-0 font-semibold text-teal hover:underline">
        Edit
      </button>
    </div>
  );
}
