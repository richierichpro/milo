"use client";

import { useState } from "react";
import { averageCost, formatINR } from "@/lib/money";
import { settleUp } from "@/lib/settle";
import type { Itinerary } from "@/lib/types";

export function CostSplit({ itinerary, onAsk, busy }: { itinerary: Itinerary; onAsk?: (text: string) => void; busy?: boolean }) {
  const [equal, setEqual] = useState(false);
  const budget = itinerary.trip.budgetPerPerson;
  const over = budget ? itinerary.costs.filter((c) => c.total > budget) : [];
  const { average, transfers } = settleUp(itinerary.costs);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-xl">Cost split</h3>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={equal} onChange={(e) => setEqual(e.target.checked)} className="accent-teal" />
          Equal split
        </label>
      </div>

      {budget &&
        over.map((c) => (
          <div key={c.person} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-coral/40 bg-coral/10 p-3 text-sm">
            <span>
              <span className="font-semibold">{c.person}</span> is {formatINR(c.total - budget)} over budget
            </span>
            {onAsk && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onAsk(`Find ${c.person} cheaper flights`)}
                className="rounded-full bg-coral px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
              >
                Find {c.person} cheaper flights
              </button>
            )}
          </div>
        ))}

      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-sand-deep/60 text-left text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Who</th>
              <th className="px-3 py-2 text-right font-medium">Flights</th>
              <th className="px-3 py-2 text-right font-medium">Hotel share</th>
              <th className="px-3 py-2 text-right font-medium">{equal ? "Pays (equal)" : "Total"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {itinerary.costs.map((c) => {
              const shown = equal ? average : c.total;
              return (
                <tr key={c.person}>
                  <td className="px-3 py-2">{c.person}</td>
                  <td className="px-3 py-2 text-right">{formatINR(c.flights)}</td>
                  <td className="px-3 py-2 text-right">{formatINR(c.hotelShare)}</td>
                  <td className={`px-3 py-2 text-right font-semibold ${budget && shown > budget ? "text-coral" : ""}`}>{formatINR(shown)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {equal && (
          <div className="border-t border-line px-3 py-2 text-sm">
            <p className="font-semibold">To settle up</p>
            {transfers.length ? (
              <ul className="text-muted">
                {transfers.map((t) => (
                  <li key={`${t.from}-${t.to}`}>
                    {t.from} pays {t.to} {formatINR(t.amount)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">Everyone already pays the same.</p>
            )}
          </div>
        )}
        <p className="border-t border-line px-3 py-2 text-xs text-muted">
          Hotel share = price per night × {itinerary.nights} nights × {itinerary.rooms} rooms ÷ {itinerary.costs.length} people. Average{" "}
          {formatINR(averageCost(itinerary.costs))}
          {budget ? ` · budget ${formatINR(budget)}` : ""}.{equal ? " Equal split assumes each person books their own flights, then settles up." : ""}
        </p>
      </div>
    </section>
  );
}
