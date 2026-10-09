"use client";

import { dayLabel, initials } from "@/lib/format";
import { averageCost, formatINR } from "@/lib/money";
import type { Itinerary } from "@/lib/types";
import { VerifiedBadge } from "./VerifiedBadge";

const AVATAR_COLORS = ["bg-teal", "bg-marigold", "bg-coral", "bg-[#6b4c9a]", "bg-[#2f855a]", "bg-[#b83280]"];

export function PlanHeader({ itinerary, children }: { itinerary: Itinerary; children?: React.ReactNode }) {
  const { trip, verification: v } = itinerary;
  return (
    <header className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-widest text-teal">
            {trip.destination} · {dayLabel(trip.startDate)} – {dayLabel(trip.endDate)}
          </p>
          <h2 className="font-display text-3xl leading-tight">{itinerary.title}</h2>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl text-teal">{formatINR(averageCost(itinerary.costs))}</p>
          <p className="text-sm text-muted">per person, on average</p>
        </div>
      </div>
      <p className="text-ink/80">{itinerary.summary}</p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex -space-x-2">
          {trip.squad.map((p, i) => (
            <span
              key={p.name}
              title={`${p.name} · ${p.city}`}
              className={`grid h-9 w-9 place-items-center rounded-full border-2 border-sand text-sm font-bold text-white ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}
            >
              {initials(p.name)}
            </span>
          ))}
        </div>
        <VerifiedBadge v={v} />
        {children}
      </div>
    </header>
  );
}
