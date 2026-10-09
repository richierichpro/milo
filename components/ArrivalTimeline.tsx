import { clock } from "@/lib/format";
import { formatINR } from "@/lib/money";
import type { Itinerary } from "@/lib/types";

const toMin = (t: string) => Date.parse(`${t.replace(" ", "T")}:00Z`) / 60_000;

/** One dot per friend on a time axis, with the together window highlighted. */
export function ArrivalTimeline({ itinerary }: { itinerary: Itinerary }) {
  const arrivals = itinerary.flights.filter((f) => f.out).map((f) => ({ person: f.person, t: f.out!.arriveTime }));
  const w = itinerary.arrivalWindow;
  if (!w || arrivals.length < 2) return null;
  const pad = 60;
  const lo = toMin(w.first) - pad;
  const hi = toMin(w.last) + pad;
  const pos = (t: string) => `${((toMin(t) - lo) / (hi - lo)) * 100}%`;
  const extra = w.extraVsCheapest;

  return (
    <section className="rounded-2xl border border-line bg-white p-4">
      <p className="font-semibold">
        Everyone lands between {clock(w.first)} and {clock(w.last)}
        <span className="font-normal text-muted">
          {" "}
          · {extra > 0 ? `${formatINR(extra)} more than the cheapest scattered flights` : "and it's also the cheapest combination"}
        </span>
      </p>
      <div className="relative mt-8 mb-6 h-2 rounded-full bg-sand-deep">
        <div className="absolute inset-y-0 rounded-full bg-marigold/50" style={{ left: pos(w.first), right: `calc(100% - ${pos(w.last)})` }} />
        {arrivals.map((a, i) => (
          <div key={a.person} className="absolute -translate-x-1/2" style={{ left: pos(a.t), top: -5 }}>
            <div className="h-[18px] w-[18px] rounded-full border-2 border-white bg-teal shadow" title={`${a.person} lands ${clock(a.t)}`} />
            <p className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-xs ${i % 2 ? "top-5" : "-top-5"}`}>
              {a.person} {clock(a.t)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
