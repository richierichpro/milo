import type { TripInput } from "./types";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Returns a clean TripInput, or an error message. */
export function parseTripInput(body: unknown): TripInput | string {
  const b = body as Partial<TripInput> | null;
  if (!b || !Array.isArray(b.squad)) return "Add at least one person to the squad.";
  const squad = b.squad
    .map((p) => ({ name: String(p?.name ?? "").trim().slice(0, 40), city: String(p?.city ?? "").trim().slice(0, 60) }))
    .filter((p) => p.name && p.city)
    .slice(0, 8);
  if (!squad.length) return "Add at least one person with a home city.";
  if (!String(b.destination ?? "").trim()) return "Pick where you're going.";
  if (new Set(squad.map((p) => p.name.toLowerCase())).size !== squad.length) return "Each person needs a different name.";
  const startDate = String(b.startDate ?? "");
  const endDate = String(b.endDate ?? "");
  if (!DATE.test(startDate) || !DATE.test(endDate) || endDate <= startDate) return "Pick a start date before the end date.";
  if ((Date.parse(endDate) - Date.parse(startDate)) / 86_400_000 > 10) return "Trips can be at most 10 days.";
  return {
    squad,
    destination: String(b.destination ?? "").trim().slice(0, 60),
    startDate,
    endDate,
    interests: Array.isArray(b.interests) ? b.interests.map(String).slice(0, 6) : [],
    budgetPerPerson: Number(b.budgetPerPerson) > 0 ? Number(b.budgetPerPerson) : undefined,
  };
}
