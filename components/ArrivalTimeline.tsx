import { clock } from "@/lib/format";
import { airportSplitNote } from "@/lib/land-together";
import { formatINR } from "@/lib/money";
import type { Itinerary } from "@/lib/types";

const toMin = (t: string) => Date.parse(`${t.replace(" ", "T")}:00Z`) / 60_000;
/** Horizontal room one label needs, in % of the axis. */
const LABEL_WIDTH = 24;
const ROW_HEIGHT = 18;

/** Greedy rows: each label goes in the first row where it doesn't overlap the previous one. */
function stackRows(positions: number[]): number[] {
  const rowEnds: number[] = [];
  const order = positions.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
  const rows = new Array<number>(positions.length);
  for (const { p, i } of order) {
    let r = rowEnds.findIndex((end) => p - LABEL_WIDTH / 2 >= end);
    if (r < 0) r = rowEnds.push(0) - 1;
    rowEnds[r] = p + LABEL_WIDTH / 2;
    rows[i] = r;
  }
  return rows;
}

/** One dot per friend on a time axis, with the together window highlighted. */
export function ArrivalTimeline({ itinerary }: { itinerary: Itinerary }) {
  const arrivals = itinerary.flights.filter((f) => f.out).map((f) => ({ person: f.person, t: f.out!.arriveTime, code: f.out!.to }));
  const w = itinerary.arrivalWindow;
  if (!w || arrivals.length < 2) return null;
  const pad = 60;
  const lo = toMin(w.first) - pad;
  const hi = toMin(w.last) + pad;
  const pct = (t: string) => ((toMin(t) - lo) / (hi - lo)) * 100;
  const rows = stackRows(arrivals.map((a) => pct(a.t)));
  const rowCount = Math.max(...rows) + 1;
  const extra = w.extraVsCheapest;
  const split = [airportSplitNote(itinerary.flights, "out"), airportSplitNote(itinerary.flights, "back")].filter(Boolean);
  const airports = [...new Set(arrivals.map((a) => a.code))];

  return (
    <section className="rounded-2xl border border-line bg-white p-4">
      <p className="font-semibold">
        Everyone lands between {clock(w.first)} and {clock(w.last)}
        {airports.length === 1 ? ` at ${airports[0]}` : ""}
        <span className="font-normal text-muted">
          {" "}
          · {extra > 0 ? `${formatINR(extra)} more than the cheapest scattered flights` : "and it's also the cheapest combination"}
        </span>
      </p>
      {split.map((s) => (
        <p key={s} className="mt-1 text-sm font-semibold text-coral">
          ⚠ {s}
        </p>
      ))}
      <div className="relative mt-5 h-2 rounded-full bg-sand-deep">
        <div className="absolute inset-y-0 rounded-full bg-marigold/50" style={{ left: `${pct(w.first)}%`, right: `${100 - pct(w.last)}%` }} />
        {arrivals.map((a) => (
          <div
            key={a.person}
            className="absolute h-[18px] w-[18px] -translate-x-1/2 rounded-full border-2 border-white bg-teal shadow"
            style={{ left: `${pct(a.t)}%`, top: -5 }}
            title={`${a.person} lands ${clock(a.t)} at ${a.code}`}
          />
        ))}
      </div>
      <div className="relative mt-3" style={{ height: rowCount * ROW_HEIGHT }}>
        {arrivals.map((a, i) => (
          <p
            key={a.person}
            className="absolute -translate-x-1/2 whitespace-nowrap text-xs"
            style={{ left: `${Math.min(88, Math.max(12, pct(a.t)))}%`, top: rows[i] * ROW_HEIGHT }}
          >
            <span className="font-semibold">{a.person}</span> {clock(a.t)} <span className="text-muted">{a.code}</span>
          </p>
        ))}
      </div>
    </section>
  );
}
