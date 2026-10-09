"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { DEMO_TRIP } from "@/lib/demo-trip";
import type { StreamMessage } from "@/lib/messages";
import { pointsFor, type MapPoint } from "@/lib/map-points";
import { readNdjson } from "@/lib/ndjson";
import type { CallLogEntry, DestinationOption, Itinerary, SquadMatch as Match, TripInput } from "@/lib/types";
import { ArrivalTimeline } from "./ArrivalTimeline";
import { ChatBox } from "./ChatBox";
import { CostSplit } from "./CostSplit";
import { DayTimeline } from "./DayTimeline";
import { FlightsSection } from "./FlightsSection";
import { HotelCard } from "./HotelCard";
import { PlanHeader } from "./PlanHeader";
import { ProgressFeed } from "./ProgressFeed";
import { SquadMatch } from "./SquadMatch";
import { TripForm } from "./TripForm";
import { WhatsAppButton } from "./WhatsAppButton";

const TripMap = dynamic(() => import("./TripMap"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-muted">Loading map…</div>,
});

export function Pakka() {
  const [trip, setTrip] = useState<TripInput>(DEMO_TRIP);
  const [progress, setProgress] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string>();
  const [itinerary, setItinerary] = useState<Itinerary>();
  const [, setReceipts] = useState<CallLogEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [match, setMatch] = useState<Match>();

  const run = useCallback(async (input: TripInput) => {
    setRunning(true);
    setError(undefined);
    setProgress([]);
    try {
      const res = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      if (!res.ok && res.headers.get("content-type")?.includes("json")) throw new Error((await res.json()).error);
      await readNdjson<StreamMessage>(res, (msg) => {
        if (msg.type === "progress") setProgress((p) => [...p, msg.text]);
        else if (msg.type === "error") setError(msg.message);
        else if (msg.type === "destinations") {
          setMatch(msg.match);
          setItinerary(undefined);
          setReceipts(msg.receipts);
        } else if (msg.type === "plan") {
          setItinerary(msg.itinerary);
          setReceipts(msg.receipts);
          setSelectedId(undefined);
        }
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  }, []);

  const makePlan = () => {
    if (!trip.destination.trim()) setMatch(undefined);
    run({ ...trip, destinationAirport: undefined });
  };
  const pick = (o: DestinationOption) => {
    const next = { ...trip, destination: o.destination.name, destinationAirport: o.destination.airportCode };
    setTrip(next);
    run(next);
  };

  const points = useMemo(() => (itinerary ? pointsFor(itinerary) : match ? matchPoints(match) : []), [itinerary, match]);
  const lines = useMemo(() => (!itinerary && match ? matchLines(match) : []), [itinerary, match]);

  return (
    <div className="grid min-h-screen grid-cols-1 lg:h-screen lg:grid-cols-[minmax(320px,30%)_1fr_minmax(320px,32%)]">
      <aside className="space-y-5 border-line p-5 lg:overflow-y-auto lg:border-r">
        <div>
          <h1 className="font-display text-4xl text-teal">Pakka</h1>
          <p className="text-muted">The Goa plan that actually happens.</p>
        </div>
        <TripForm value={trip} onChange={setTrip} onSubmit={makePlan} busy={running} />
        <ProgressFeed lines={progress} running={running} />
        {error && <p className="rounded-2xl bg-coral/10 p-3 text-sm text-coral">{error}</p>}
        {itinerary && <ChatBox disabled />}
      </aside>

      <main className="space-y-6 p-5 lg:overflow-y-auto">
        {itinerary ? (
          <>
            {match && (
              <button type="button" className="text-sm font-semibold text-teal hover:underline" onClick={() => setItinerary(undefined)}>
                ← Back to Squad Match
              </button>
            )}
            <PlanHeader itinerary={itinerary}>
              <WhatsAppButton itinerary={itinerary} />
            </PlanHeader>
            <ArrivalTimeline itinerary={itinerary} />
            <FlightsSection flights={itinerary.flights} destination={itinerary.trip.destination} />
            <HotelCard
              hotel={itinerary.hotel}
              nights={itinerary.nights}
              rooms={itinerary.rooms}
              selected={!!itinerary.hotel && selectedId === itinerary.hotel.id}
              onSelect={() => setSelectedId(itinerary.hotel?.id)}
            />
            <DayTimeline days={itinerary.days} selectedId={selectedId} onSelect={setSelectedId} />
            <CostSplit itinerary={itinerary} />
          </>
        ) : match ? (
          <SquadMatch match={match} onPick={pick} busy={running} />
        ) : (
          <EmptyState running={running} />
        )}
      </main>

      <section className="h-[360px] border-line lg:sticky lg:top-0 lg:h-screen lg:border-l">
        <TripMap points={points} lines={lines} selectedId={selectedId} onSelect={setSelectedId} />
      </section>
    </div>
  );
}

function EmptyState({ running }: { running: boolean }) {
  return (
    <div className="grid h-full min-h-[300px] place-items-center text-center">
      <div className="max-w-sm space-y-2">
        <p className="font-display text-2xl text-teal">{running ? "Searching Google for real options…" : "Four friends. Four cities. One plan."}</p>
        <p className="text-muted">
          {running
            ? "Every flight, hotel and place in your plan will come from these searches."
            : "Fill in the squad and press “Make it pakka”. Every flight, hotel, place and event comes from live Google results."}
        </p>
      </div>
    </div>
  );
}

const LINE_COLORS = ["#0f5257", "#e0603f", "#6b4c9a", "#2f855a", "#b83280", "#2b6cb0"];

function matchPoints(m: Match): MapPoint[] {
  const homes = m.homes
    .filter((h) => h.lat !== undefined && h.lng !== undefined)
    .map((h, i) => ({ id: `home:${h.person}`, lat: h.lat!, lng: h.lng!, label: h.person[0], color: LINE_COLORS[i % LINE_COLORS.length], title: `${h.person} · ${h.city}` }));
  const dests = m.options
    .filter((o) => o.destination.lat !== undefined && o.destination.lng !== undefined)
    .map((o, i) => ({ id: o.destination.id, lat: o.destination.lat!, lng: o.destination.lng!, label: String(i + 1), color: "#f0a202", title: `#${i + 1} ${o.destination.name}` }));
  return [...homes, ...dests];
}

function matchLines(m: Match) {
  return m.homes.flatMap((h, i) =>
    h.lat === undefined || h.lng === undefined
      ? []
      : m.options
          .filter((o) => o.destination.lat !== undefined && o.destination.lng !== undefined)
          .map((o) => ({ from: [h.lat!, h.lng!] as [number, number], to: [o.destination.lat!, o.destination.lng!] as [number, number], color: LINE_COLORS[i % LINE_COLORS.length] })),
  );
}
