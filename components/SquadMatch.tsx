"use client";

import { formatINR } from "@/lib/money";
import type { DestinationOption, SquadMatch as Match } from "@/lib/types";
import { Photo } from "./Photo";

export function SquadMatch({ match, onPick, busy }: { match: Match; onPick: (o: DestinationOption) => void; busy: boolean }) {
  return (
    <section className="space-y-4">
      <header>
        <p className="text-sm uppercase tracking-widest text-teal">Squad Match</p>
        <h2 className="font-display text-3xl">Where can everyone go?</h2>
        <p className="text-muted">
          Ranked by what the whole squad pays and how fair it is. Estimates from Google Travel Explore (round-trip flights) and Google Hotels (typical
          nightly price, room shared by two).
        </p>
      </header>
      {match.message && <p className="rounded-2xl bg-marigold-soft p-4">{match.message}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {match.options.map((o, i) => {
          const each = o.groupTotal / o.perPerson.length;
          const n = o.perPerson.length;
          return (
            <button
              key={o.destination.id}
              type="button"
              disabled={busy}
              onClick={() => onPick(o)}
              className="overflow-hidden rounded-2xl border border-line bg-white text-left transition hover:border-teal hover:shadow-md disabled:opacity-60"
            >
              <div className="relative">
                <Photo src={o.destination.thumbnail} alt={o.destination.name} className="h-32 w-full" />
                <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-sm font-bold text-teal">#{i + 1}</span>
              </div>
              <div className="space-y-2 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-display text-xl">{o.destination.name}</p>
                  <p className="font-semibold text-teal">≈ {formatINR(each)} each</p>
                </div>
                <p className="flex flex-wrap gap-2 text-xs">
                  <span className={`rounded-full px-2 py-0.5 ${o.withinBudget === n ? "bg-ok/10 text-ok" : "bg-coral/10 text-coral"}`}>
                    {o.withinBudget}/{n} within budget
                  </span>
                  <span className="rounded-full bg-sand-deep px-2 py-0.5">gap {formatINR(o.fairnessGap)}</span>
                  {o.hotelPerNight ? <span className="rounded-full bg-sand-deep px-2 py-0.5">hotels ~{formatINR(o.hotelPerNight)}/night</span> : null}
                </p>
                <p className="flex flex-wrap gap-1 text-xs">
                  {o.perPerson.map((p) => (
                    <span key={p.person} className={`rounded-full border px-2 py-0.5 ${p.withinBudget ? "border-line" : "border-coral/40 text-coral"}`}>
                      {p.person} {formatINR(p.total)}
                    </span>
                  ))}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
