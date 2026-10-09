"use client";

import type { TripInput } from "@/lib/types";

const INTERESTS = ["beaches", "food", "nightlife", "heritage", "adventure", "cafes"];

const field = "w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-teal";

export function TripForm({
  value,
  onChange,
  onSubmit,
  busy,
}: {
  value: TripInput;
  onChange: (v: TripInput) => void;
  onSubmit: () => void;
  busy: boolean;
}) {
  const set = <K extends keyof TripInput>(k: K, v: TripInput[K]) => onChange({ ...value, [k]: v });
  const setPerson = (i: number, key: "name" | "city", v: string) =>
    set("squad", value.squad.map((p, j) => (j === i ? { ...p, [key]: v } : p)));

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-semibold">The squad</legend>
        {value.squad.map((p, i) => (
          <div key={i} className="flex gap-2">
            <input className={field} placeholder="Name" value={p.name} onChange={(e) => setPerson(i, "name", e.target.value)} aria-label="Name" />
            <input className={field} placeholder="Home city" value={p.city} onChange={(e) => setPerson(i, "city", e.target.value)} aria-label="Home city" />
            <button
              type="button"
              className="rounded-xl px-2 text-muted hover:bg-sand-deep hover:text-coral disabled:opacity-30"
              onClick={() => set("squad", value.squad.filter((_, j) => j !== i))}
              disabled={value.squad.length <= 1}
              aria-label={`Remove ${p.name || "person"}`}
            >
              ✕
            </button>
          </div>
        ))}
        {value.squad.length < 8 && (
          <button type="button" className="text-sm font-semibold text-teal hover:underline" onClick={() => set("squad", [...value.squad, { name: "", city: "" }])}>
            + Add a friend
          </button>
        )}
      </fieldset>

      <label className="block space-y-1">
        <span className="text-sm font-semibold">Where to?</span>
        <input className={field} placeholder="Leave empty and Pakka finds a place" value={value.destination} onChange={(e) => set("destination", e.target.value)} />
      </label>

      <div className="flex gap-2">
        <label className="block flex-1 space-y-1">
          <span className="text-sm font-semibold">From</span>
          <input type="date" className={field} value={value.startDate} onChange={(e) => set("startDate", e.target.value)} />
        </label>
        <label className="block flex-1 space-y-1">
          <span className="text-sm font-semibold">To</span>
          <input type="date" className={field} value={value.endDate} onChange={(e) => set("endDate", e.target.value)} />
        </label>
      </div>

      <div className="space-y-1">
        <span className="text-sm font-semibold">Into</span>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => {
            const on = value.interests.includes(i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => set("interests", on ? value.interests.filter((x) => x !== i) : [...value.interests, i])}
                className={`rounded-full border px-3 py-1 text-sm capitalize ${on ? "border-teal bg-teal text-white" : "border-line bg-white text-ink hover:border-teal"}`}
                aria-pressed={on}
              >
                {i}
              </button>
            );
          })}
        </div>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-semibold">Budget per person (₹)</span>
        <input
          type="number"
          min={0}
          step={500}
          className={field}
          value={value.budgetPerPerson ?? ""}
          onChange={(e) => set("budgetPerPerson", e.target.value ? Number(e.target.value) : undefined)}
        />
      </label>

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-2xl bg-teal px-4 py-3 font-display text-lg text-white shadow-sm transition hover:bg-teal/90 disabled:opacity-60"
      >
        {busy ? "Making it pakka…" : "Make it pakka"}
      </button>
    </form>
  );
}
