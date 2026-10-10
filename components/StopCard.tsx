"use client";

import type { Stop } from "@/lib/types";
import { Photo } from "./Photo";
import { BookButton } from "./BookButton";
import { Rating } from "./Rating";

/** Book tickets / tours / event tickets where Google lists them; otherwise directions. */
function Actions({ stop }: { stop: Stop }) {
  if (stop.kind === "event") {
    const e = stop.item;
    // Google's events box often has no link; fall back to a ticket search for this exact event.
    const search = `https://www.google.com/search?q=${encodeURIComponent(`${e.title} ${e.venue ?? ""} tickets`.trim())}`;
    return e.link ? <BookButton href={e.link}>Get tickets</BookButton> : <BookButton href={search}>Find tickets</BookButton>;
  }
  const entry = stop.item.prices?.admission[0];
  const tour = stop.item.prices?.tours[0];
  return (
    <>
      {entry && <BookButton href={entry.link}>Book tickets {entry.priceText.replace(/\.00$/, "")}</BookButton>}
      {tour && (
        <BookButton href={tour.link} primary={!entry}>
          Book tour from {tour.priceText}
        </BookButton>
      )}
      <BookButton href={stop.item.mapsUrl} primary={false}>
        Directions
      </BookButton>
    </>
  );
}

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
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect())}
      className={`flex w-full cursor-pointer gap-3 rounded-2xl border bg-white p-3 text-left transition hover:shadow-md ${
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
          {isPlace && !stop.item.prices?.admission.length && (stop.item.prices?.priceRange ?? stop.item.priceLevel) && (
            <span>{stop.item.prices?.priceRange ?? stop.item.priceLevel} per person</span>
          )}
        </p>
        {stop.why && (
          <p className="mt-1 text-sm text-ink/80">
            <span className="text-teal">Pakka&apos;s note:</span> {stop.why}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          <Actions stop={stop} />
        </div>
      </div>
    </div>
  );
}
