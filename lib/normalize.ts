/* eslint-disable @typescript-eslint/no-explicit-any -- raw SerpApi JSON is parsed here */
import { createHash } from "node:crypto";
import type { Destination, Event, Flight, Hotel, Place, Source } from "./types";

// Raw SerpApi JSON is parsed here and nowhere else. Missing fields become
// undefined; items we can't place on a map or price are skipped.

const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : undefined);

function fetchedAt(json: any): string {
  const raw = str(json?.search_metadata?.created_at);
  const d = raw ? new Date(raw.replace(" UTC", "Z").replace(" ", "T")) : new Date();
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function source(json: any, engine: string, url?: string): Source {
  const meta = json?.search_metadata ?? {};
  return { engine, url: url ?? str(meta[`${engine}_url`]), fetchedAt: fetchedAt(json) };
}

function coords(o: any): { lat: number; lng: number } | undefined {
  const lat = num(o?.gps_coordinates?.latitude);
  const lng = num(o?.gps_coordinates?.longitude);
  return lat !== undefined && lng !== undefined ? { lat, lng } : undefined;
}

const shortHash = (s: string) => createHash("sha1").update(s).digest("hex").slice(0, 10);

export function normalizeFlights(json: any): Flight[] {
  const options: any[] = [...(json?.best_flights ?? []), ...(json?.other_flights ?? [])];
  const src = source(json, "google_flights");
  const out: Flight[] = [];
  for (const o of options) {
    const segs: any[] = Array.isArray(o?.flights) ? o.flights : [];
    const price = num(o?.price);
    if (!segs.length || price === undefined) continue;
    const first = segs[0];
    const last = segs[segs.length - 1];
    const departTime = str(first?.departure_airport?.time);
    const arriveTime = str(last?.arrival_airport?.time);
    if (!departTime || !arriveTime) continue;
    const flightNumbers = segs.map((s) => str(s?.flight_number)).filter((x): x is string => !!x);
    const airlines = [...new Set(segs.map((s) => str(s?.airline)).filter(Boolean))];
    out.push({
      id: `flight:${flightNumbers.join("+").replace(/\s+/g, "")}@${departTime}`,
      source: src,
      from: str(first?.departure_airport?.id) ?? "",
      to: str(last?.arrival_airport?.id) ?? "",
      departTime,
      arriveTime,
      airline: airlines.join(" + ") || "Unknown airline",
      airlineLogo: str(o?.airline_logo) ?? str(first?.airline_logo),
      flightNumbers,
      stops: segs.length - 1,
      durationMin: num(o?.total_duration) ?? 0,
      pricePerPerson: price,
    });
  }
  // The same itinerary can appear in both lists.
  return [...new Map(out.map((f) => [f.id, f])).values()];
}

export function normalizeHotels(json: any): Hotel[] {
  const src = source(json, "google_hotels");
  const out: Hotel[] = [];
  for (const p of json?.properties ?? []) {
    const c = coords(p);
    const token = str(p?.property_token);
    const name = str(p?.name);
    if (!c || !token || !name) continue;
    out.push({
      id: `hotel:${token}`,
      source: { ...src, url: str(p?.link) ?? src.url },
      name,
      ...c,
      pricePerNight: num(p?.rate_per_night?.extracted_lowest),
      rating: num(p?.overall_rating),
      reviews: num(p?.reviews),
      stars: num(p?.extracted_hotel_class),
      thumbnail: str(p?.images?.[0]?.thumbnail),
      amenities: Array.isArray(p?.amenities) ? p.amenities.filter((a: unknown) => typeof a === "string") : [],
      link: str(p?.link),
    });
  }
  return out;
}

export function normalizePlaces(json: any): Place[] {
  const src = source(json, "google_maps");
  const out: Place[] = [];
  const results: any[] = json?.local_results ?? (json?.place_results ? [json.place_results] : []);
  for (const r of results) {
    const c = coords(r);
    const placeId = str(r?.place_id);
    const name = str(r?.title);
    if (!c || !placeId || !name) continue;
    const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${placeId}`;
    out.push({
      id: `place:${placeId}`,
      source: { ...src, url: mapsUrl },
      name,
      category: str(r?.type),
      ...c,
      rating: num(r?.rating),
      reviews: num(r?.reviews),
      priceLevel: str(r?.price),
      address: str(r?.address),
      hours: str(r?.hours),
      thumbnail: str(r?.thumbnail),
      description: str(r?.description),
      mapsUrl,
    });
  }
  return [...new Map(out.map((p) => [p.id, p])).values()];
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "21 Nov" / "Nov 21" / "Sat, Nov 21" → "2026-11-21", using the trip's year. */
export function parseEventDate(text: string | undefined, year: number): string | undefined {
  if (!text) return undefined;
  const m = text.toLowerCase().match(/(\d{1,2})\s+([a-z]{3})|([a-z]{3})[a-z]*\s+(\d{1,2})/);
  if (!m) return undefined;
  const day = Number(m[1] ?? m[4]);
  const month = MONTHS.indexOf((m[2] ?? m[3]).slice(0, 3));
  if (month < 0 || day < 1 || day > 31) return undefined;
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function normalizeEvents(json: any, year: number): Event[] {
  const src = source(json, "google");
  const out: Event[] = [];
  for (const e of json?.events_results ?? []) {
    const title = str(e?.title);
    if (!title) continue;
    const d = e?.date;
    const dateText =
      typeof d === "string" ? str(d) : [str(d?.start_date), str(d?.when)].filter(Boolean).join(" · ") || undefined;
    const startText = typeof d === "string" ? d : (str(d?.start_date) ?? str(d?.when));
    const address = Array.isArray(e?.address) ? e.address.filter((a: unknown) => typeof a === "string") : [];
    const link = str(e?.link) ?? str(e?.ticket_info?.[0]?.link);
    out.push({
      id: `event:${shortHash(`${title}|${dateText ?? ""}`)}`,
      source: { ...src, url: link ?? src.url },
      title,
      dateText,
      date: parseEventDate(startText, year),
      venue: str(e?.venue?.name) ?? address[0],
      address: address.join(", ") || undefined,
      link,
      thumbnail: str(e?.thumbnail) ?? str(e?.image),
    });
  }
  return [...new Map(out.map((e) => [e.id, e])).values()];
}

export function normalizeDestinations(json: any): Destination[] {
  const src = source(json, "google_travel_explore");
  const out: Destination[] = [];
  for (const d of json?.destinations ?? []) {
    const id = str(d?.destination_id);
    const name = str(d?.name);
    if (!id || !name) continue;
    const c = coords(d);
    out.push({
      id: `dest:${id}`,
      name,
      country: str(d?.country),
      lat: c?.lat,
      lng: c?.lng,
      airportCode: str(d?.destination_airport?.code),
      flightPrice: num(d?.flight_price),
      hotelPrice: num(d?.hotel_price),
      startDate: str(d?.start_date),
      endDate: str(d?.end_date),
      thumbnail: str(d?.thumbnail),
      airline: str(d?.airline),
      stops: num(d?.number_of_stops),
      source: { ...src, url: str(d?.link) ?? src.url },
    });
  }
  return out;
}
