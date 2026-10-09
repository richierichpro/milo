"use client";

import { formatINR } from "@/lib/money";
import type { Hotel } from "@/lib/types";
import { Photo } from "./Photo";
import { ProofLine } from "./ProofLine";
import { Rating } from "./Rating";

export function HotelCard({
  hotel,
  nights,
  rooms,
  selected,
  highlighted,
  onSelect,
}: {
  hotel?: Hotel;
  nights: number;
  rooms: number;
  selected: boolean;
  highlighted?: boolean;
  onSelect: () => void;
}) {
  if (!hotel) return <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">No hotel could be checked for these dates.</p>;
  return (
    <section>
      <h3 className="mb-2 font-display text-xl">Where you&apos;ll stay</h3>
      <button
        type="button"
        onClick={onSelect}
        className={`flex w-full gap-4 overflow-hidden rounded-2xl border bg-white text-left hover:shadow-md ${selected ? "border-teal ring-2 ring-teal/30" : "border-line"} ${highlighted ? "animate-pulse bg-marigold-soft" : ""}`}
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
          {hotel.amenities.length ? <p className="mt-1 truncate text-xs text-muted">{hotel.amenities.slice(0, 4).join(" · ")}</p> : null}
          <ProofLine source={hotel.source} />
        </div>
      </button>
    </section>
  );
}
