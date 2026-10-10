"use client";

import { clock, duration, stopsLabel } from "@/lib/format";
import { formatINR } from "@/lib/money";
import type { Flight, FlightPick } from "@/lib/types";
import { Photo } from "./Photo";
import { BookButton } from "./BookButton";

function Leg({ f, label }: { f?: Flight; label: string }) {
  if (!f) return <p className="text-sm text-muted">{label}: couldn&apos;t check this</p>;
  const nextDay = f.arriveTime.slice(0, 10) !== f.departTime.slice(0, 10);
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-10 text-xs uppercase tracking-wide text-muted">{label}</span>
      <Photo src={f.airlineLogo} alt={f.airline} className="h-5 w-5 rounded" />
      <span className="font-semibold">
        {f.from} {clock(f.departTime)} → {f.to} {clock(f.arriveTime)}
        {nextDay && <sup className="text-coral">+1</sup>}
      </span>
      <span className="text-muted">
        · {duration(f.durationMin)} · {stopsLabel(f.stops, f.via)}
        <span className="hidden sm:inline"> · {f.airline}</span>
      </span>
      <span className="ml-auto font-semibold">{formatINR(f.pricePerPerson)}</span>
      <BookButton href={f.source.url}>Book</BookButton>
    </div>
  );
}

export function FlightsSection({ flights, destination, highlightIds }: { flights: FlightPick[]; destination: string; highlightIds?: Set<string> }) {
  return (
    <section>
      <h3 className="mb-2 font-display text-xl">Flights</h3>
      <div className="divide-y divide-line rounded-2xl border border-line bg-white">
        {flights.map((p) => (
          <div
            key={p.person}
            className={`space-y-1 p-3 transition ${[p.out?.id, p.back?.id].some((id) => id && highlightIds?.has(id)) ? "animate-pulse bg-marigold-soft" : ""}`}
          >
            <p className="text-sm">
              <span className="font-semibold">{p.person}</span>
              <span className="text-muted">
                {" "}
                · {p.city} → {destination}
              </span>
            </p>
            <Leg f={p.out} label="Out" />
            <Leg f={p.back} label="Back" />
          </div>
        ))}
      </div>
    </section>
  );
}
