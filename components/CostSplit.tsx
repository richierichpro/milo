import { averageCost, formatINR } from "@/lib/money";
import type { Itinerary } from "@/lib/types";

export function CostSplit({ itinerary }: { itinerary: Itinerary }) {
  const budget = itinerary.trip.budgetPerPerson;
  return (
    <section>
      <h3 className="mb-2 font-display text-xl">Cost split</h3>
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-sand-deep/60 text-left text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Who</th>
              <th className="px-3 py-2 text-right font-medium">Flights</th>
              <th className="px-3 py-2 text-right font-medium">Hotel share</th>
              <th className="px-3 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {itinerary.costs.map((c) => (
              <tr key={c.person}>
                <td className="px-3 py-2">{c.person}</td>
                <td className="px-3 py-2 text-right">{formatINR(c.flights)}</td>
                <td className="px-3 py-2 text-right">{formatINR(c.hotelShare)}</td>
                <td className={`px-3 py-2 text-right font-semibold ${budget && c.total > budget ? "text-coral" : ""}`}>{formatINR(c.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-line px-3 py-2 text-xs text-muted">
          Hotel share = price per night × {itinerary.nights} nights × {itinerary.rooms} rooms ÷ {itinerary.costs.length} people. Average{" "}
          {formatINR(averageCost(itinerary.costs))}
          {budget ? ` · budget ${formatINR(budget)}` : ""}.
        </p>
      </div>
    </section>
  );
}
