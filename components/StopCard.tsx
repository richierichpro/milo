"use client";

import type { Stop } from "@/lib/types";
import { Photo } from "./Photo";
import { ProofLine } from "./ProofLine";
import { Rating } from "./Rating";

export function StopCard({
  stop,
  index,
  color,
  selected,
  highlighted,
  onSelect,
}: {
  stop: Stop;
  index: number;
  color: string;
  selected: boolean;
  highlighted?: boolean;
  onSelect: () => void;
}) {
  const isPlace = stop.kind === "place";
  const name = isPlace ? stop.item.name : stop.item.title;
  const sub = isPlace ? stop.item.category : `Event · ${stop.item.dateText ?? ""}${stop.item.venue ? ` · ${stop.item.venue}` : ""}`;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full gap-3 rounded-2xl border bg-white p-3 text-left transition hover:shadow-md ${
        selected ? "border-teal ring-2 ring-teal/30" : "border-line"
      } ${highlighted ? "animate-pulse bg-marigold-soft" : ""}`}
    >
      <div className="flex w-12 shrink-0 flex-col items-center gap-1">
        <span className="text-sm font-semibold text-ink">{stop.time}</span>
        <span className="pin" style={{ background: color }}>
          {index + 1}
        </span>
      </div>
      <Photo src={stop.item.thumbnail} alt={name} className="h-20 w-20 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-tight">{name}</p>
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
          {sub && <span>{sub}</span>}
          {isPlace && <Rating rating={stop.item.rating} reviews={stop.item.reviews} />}
          {isPlace && stop.item.priceLevel && <span>{stop.item.priceLevel}</span>}
        </p>
        <p className="mt-1 text-sm text-ink/80">
          <span className="text-teal">Pakka&apos;s note:</span> {stop.why}
        </p>
        <ProofLine source={stop.item.source} />
      </div>
    </button>
  );
}
