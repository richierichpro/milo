"use client";

import { formatINR } from "@/lib/money";
import type { Hotel } from "@/lib/types";
import { Photo } from "./Photo";
import { BookButton } from "./BookButton";
import { Rating } from "./Rating";

export function HotelCard({
  hotel,
  distanceKm,
  nights,
  rooms,
  selected,
  highlighted,
  onSelect,
}: {
  hotel?: Hotel;
  distanceKm?: number;
  nights: number;
  rooms: number;
  selected: boolean;
  highlighted?: boolean;
  onSelect: () => void;
}) {
  if (!hotel)
    return (
      <section>
        <h3 className="mb-2 font-display text-xl">Where you&apos;ll stay</h3>
        <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">Hotels: couldn&apos;t check this. Google Hotels didn&apos;t answer, so no stay is suggested.</p>
      </section>
    );
  return (
    <section>
      <h3 className="mb-2 font-display text-xl">Where you&apos;ll stay</h3>
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect())}
        className={`flex w-full cursor-pointer gap-4 overflow-hidden rounded-2xl border bg-white text-left hover:shadow-md ${selected ? "border-teal ring-2 ring-teal/30" : "border-line"} ${highlighted ? "animate-pulse bg-marigold-soft" : ""}`}
      >
        <Photo src={hotel.thumbnail} alt={hotel.name} className="h-32 w-36 shrink-0 sm:w-48" />
        <div className="min-w-0 flex-1 py-3 pr-3">
          <p className="font-semibold leading-tight">{hotel.name}</p>
          <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
            {hotel.stars ? <span>{"★".repeat(hotel.stars)} hotel</span> : null}
            <Rating rating={hotel.rating} reviews={hotel.reviews} />
          </p>
          <p className="mt-1 text-sm">
            <span className="font-semibold">{hotel.pricePerNight ? formatINR(hotel.pricePerNight) : "–"}</span>
            <span className="text-muted"> /night · {rooms} room{rooms > 1 ? "s" : ""} × {nights} nights</span>
          </p>
          {distanceKm !== undefined && <p className="mt-1 text-sm text-muted">≈ {distanceKm < 1 ? "<1" : Math.round(distanceKm)} km from most of your plan</p>}
          {hotel.amenities.length ? <p className="mt-1 truncate text-xs text-muted">{hotel.amenities.slice(0, 4).join(" · ")}</p> : null}
          <div className="mt-2">
            <BookButton href={hotel.link ?? hotel.source.url}>Book hotel</BookButton>
          </div>
        </div>
      </div>
    </section>
  );
}
