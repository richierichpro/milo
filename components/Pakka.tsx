"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { DEMO_TRIP } from "@/lib/demo-trip";
import type { StreamMessage } from "@/lib/messages";
import { pointsFor, routesFor, type MapLine, type MapPoint } from "@/lib/map-points";
import { averageCost } from "@/lib/money";
import { readNdjson } from "@/lib/ndjson";
import type { CandidatePool } from "@/lib/gather";
import type { DestinationOption, Itinerary, SquadMatch as Match, TripInput } from "@/lib/types";
import { ArrivalTimeline } from "./ArrivalTimeline";
import { ChatBox, type ChatTurn } from "./ChatBox";
import { CostSplit } from "./CostSplit";
import { DayButtons } from "./DayButtons";
import { DayTimeline } from "./DayTimeline";
import { FlightsSection } from "./FlightsSection";
import { HotelCard } from "./HotelCard";
import { PlanHeader } from "./PlanHeader";
import { ProgressFeed } from "./ProgressFeed";
import { SquadMatch } from "./SquadMatch";
import { TripForm } from "./TripForm";
import { TripSummary } from "./TripSummary";
import { WhatsAppButton } from "./WhatsAppButton";

const TripMap = dynamic(() => import("./TripMap"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-muted">Loading map…</div>,
});

export function Pakka() {
  const [trip, setTrip] = useState<TripInput>(DEMO_TRIP);
  const [editing, setEditing] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string>();
  const [itinerary, setItinerary] = useState<Itinerary>();
  const [pool, setPool] = useState<CandidatePool>();
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [chatting, setChatting] = useState(false);
  const [highlight, setHighlight] = useState<Set<string>>(new Set());
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
        } else if (msg.type === "plan") {
          setItinerary(msg.itinerary);
          setPool(msg.pool);
          setTurns([]);
          setSelectedId(undefined);
          setActiveDay(undefined);
        }
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  }, []);

  const chat = async (text: string) => {
    if (!itinerary || !pool) return;
    const before = itinerary;
    setChatting(true);
    setTurns((t) => [...t, { role: "user", text }, { role: "pakka", text: "", tools: ["Thinking…"], pending: true }]);
    const updateLast = (f: (t: Extract<ChatTurn, { role: "pakka" }>) => Extract<ChatTurn, { role: "pakka" }>) =>
      setTurns((ts) => ts.map((t, i) => (i === ts.length - 1 && t.role === "pakka" ? f(t) : t)));
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itinerary, pool, message: text }) });
      if (!res.ok && res.headers.get("content-type")?.includes("json")) throw new Error((await res.json()).error);
      await readNdjson<StreamMessage>(res, (msg) => {
        if (msg.type === "progress") updateLast((t) => ({ ...t, tools: [...t.tools.filter((x) => x !== "Thinking…"), msg.text] }));
        else if (msg.type === "error") updateLast((t) => ({ ...t, text: msg.message, error: true, pending: false }));
        else if (msg.type === "message") updateLast((t) => ({ ...t, text: msg.text, pending: false }));
        else if (msg.type === "plan") {
          setItinerary(msg.itinerary);
          setPool(msg.pool);
          updateLast((t) => ({ ...t, delta: averageCost(msg.itinerary.costs) - averageCost(before.costs) }));
          const changed = changedIds(before, msg.itinerary);
          setHighlight(changed);
          setTimeout(() => setHighlight(new Set()), 3000);
        }
      });
    } catch (err) {
      updateLast((t) => ({ ...t, text: (err as Error).message, error: true }));
    } finally {
      updateLast((t) => ({ ...t, pending: false, tools: t.tools.filter((x) => x !== "Thinking…") }));
      setChatting(false);
    }
  };

  const makePlan = () => {
    setEditing(false);
    if (!trip.destination.trim()) setMatch(undefined);
    run({ ...trip, destinationAirport: undefined });
  };
  const pick = (o: DestinationOption) => {
    const next = { ...trip, destination: o.destination.name, destinationAirport: o.destination.airportCode };
    setTrip(next);
    run(next);
  };

  const [activeDay, setActiveDay] = useState<number>();
  const [playKey, setPlayKey] = useState(0);
  /** Show one day on the map and play its route (clicking it again replays). */
  const showDay = (i: number | undefined) => {
    setActiveDay(i);
    setPlayKey((k) => k + 1);
  };

  // The map shows the hotel, plus only the day that's been picked.
  const points = useMemo(
    () =>
      itinerary ? pointsFor(itinerary).filter((p) => p.day === undefined || p.day === activeDay) : match ? matchPoints(match) : [],
    [itinerary, match, activeDay],
  );
  const lines = useMemo(
    () => (itinerary ? routesFor(itinerary).filter((r) => r.day === activeDay) : match ? matchLines(match) : []),
    [itinerary, match, activeDay],
  );
  /** Clicking a stop card shows that stop's day on the map, then flies to the stop. */
  const selectStop = (id: string) => {
    const day = itinerary?.days.findIndex((d) => d.stops.some((s) => s.item.id === id));
    if (day !== undefined && day >= 0 && day !== activeDay) showDay(day);
    setSelectedId(id);
  };

  return (
    <div className="grid flex-1 grid-cols-1 lg:min-h-0 lg:grid-cols-[minmax(320px,30%)_1fr_minmax(320px,32%)]">
      <aside className="space-y-5 border-line p-5 lg:overflow-y-auto lg:border-r">
        <div>
          <h1 className="font-display text-4xl text-teal">Pakka</h1>
          <p className="text-muted">The Goa plan that actually happens.</p>
        </div>
        {editing || !(itinerary || match) ? (
          <TripForm value={trip} onChange={setTrip} onSubmit={makePlan} busy={running} />
        ) : (
          <TripSummary trip={itinerary?.trip ?? trip} onEdit={() => setEditing(true)} />
        )}
        <ProgressFeed lines={progress} running={running} />
        {error && <p className="rounded-2xl bg-coral/10 p-3 text-sm text-coral">{error}</p>}
        {itinerary && <ChatBox turns={turns} busy={chatting || running} onSend={chat} />}
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
            {pool && pool.errors.length > 0 && (
              <div className="rounded-2xl border border-marigold/50 bg-marigold-soft p-3 text-sm">
                <p className="font-semibold">Some searches failed, so those parts couldn&apos;t be checked:</p>
                <ul className="mt-1 list-disc pl-5 text-muted">
                  {pool.errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            <ArrivalTimeline itinerary={itinerary} />
            <FlightsSection flights={itinerary.flights} destination={itinerary.trip.destination} highlightIds={highlight} />
            <HotelCard
              hotel={itinerary.hotel}
              distanceKm={itinerary.hotelDistanceKm}
              nights={itinerary.nights}
              rooms={itinerary.rooms}
              selected={!!itinerary.hotel && selectedId === itinerary.hotel.id}
              highlighted={!!itinerary.hotel && highlight.has(itinerary.hotel.id)}
              onSelect={() => setSelectedId(itinerary.hotel?.id)}
            />
            <DayTimeline
              days={itinerary.days}
              selectedId={selectedId}
              highlightIds={highlight}
              activeDay={activeDay}
              onDayClick={(i) => showDay(activeDay === i ? undefined : i)}
              onSelect={selectStop}
            />
            <CostSplit itinerary={itinerary} onAsk={chat} busy={chatting || running} />
          </>
        ) : match ? (
          <SquadMatch match={match} onPick={pick} busy={running} />
        ) : (
          <EmptyState running={running} />
        )}
      </main>

      <section className="relative h-[360px] border-line lg:h-full lg:border-l">
        {itinerary && <DayButtons days={itinerary.days} active={activeDay} onPick={showDay} />}
        {itinerary && activeDay === undefined && (
          <p className="pointer-events-none absolute inset-x-0 top-14 z-[1100] mx-auto w-fit rounded-full bg-ink/80 px-3 py-1 text-sm text-white">
            Tap a day to see its route
          </p>
        )}
        <TripMap points={points} lines={lines} selectedId={selectedId} activeDay={activeDay} playKey={playKey} onSelect={setSelectedId} />
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

function matchLines(m: Match): MapLine[] {
  return m.homes.flatMap((h, i) =>
    h.lat === undefined || h.lng === undefined
      ? []
      : m.options
          .filter((o) => o.destination.lat !== undefined && o.destination.lng !== undefined)
          .map((o) => ({
            points: [
              [h.lat!, h.lng!],
              [o.destination.lat!, o.destination.lng!],
            ] as [number, number][],
            color: LINE_COLORS[i % LINE_COLORS.length],
            dashed: true,
          })),
  );
}

/** Ids of stops, the hotel and flights that are new in the edited plan. */
function changedIds(before: Itinerary, after: Itinerary): Set<string> {
  const old = new Set<string>([
    ...before.days.flatMap((d) => d.stops.map((s) => s.item.id)),
    ...(before.hotel ? [before.hotel.id] : []),
    ...before.flights.flatMap((f) => [f.out?.id, f.back?.id].filter((x): x is string => !!x)),
  ]);
  const now = [
    ...after.days.flatMap((d) => d.stops.map((s) => s.item.id)),
    ...(after.hotel ? [after.hotel.id] : []),
    ...after.flights.flatMap((f) => [f.out?.id, f.back?.id].filter((x): x is string => !!x)),
  ];
  return new Set(now.filter((id) => !old.has(id)));
}
