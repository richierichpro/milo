"use client";

import { clock } from "@/lib/format";
import { formatINR } from "@/lib/money";
import type { Flight, FlightPick } from "@/lib/types";
import { Photo } from "./Photo";
import { ProofLine } from "./ProofLine";

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
      <span className="hidden text-muted sm:inline">
        · {f.airline} · {f.stops ? `${f.stops} stop` : "nonstop"}
      </span>
      <span className="ml-auto font-semibold">{formatINR(f.pricePerPerson)}</span>
    </div>
  );
}

export function FlightsSection({ flights, destination }: { flights: FlightPick[]; destination: string }) {
  return (
    <section>
      <h3 className="mb-2 font-display text-xl">Flights</h3>
      <div className="divide-y divide-line rounded-2xl border border-line bg-white">
        {flights.map((p) => (
          <div key={p.person} className="space-y-1 p-3">
            <p className="text-sm">
              <span className="font-semibold">{p.person}</span>
              <span className="text-muted">
                {" "}
                · {p.city} → {destination}
              </span>
            </p>
            <Leg f={p.out} label="Out" />
            <Leg f={p.back} label="Back" />
            {p.out && <ProofLine source={p.out.source} extra={`${p.out.flightNumbers.join(", ")}`} />}
          </div>
        ))}
      </div>
    </section>
  );
}
