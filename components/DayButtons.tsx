import { dayLabel, DAY_COLORS } from "@/lib/format";
import type { Day } from "@/lib/types";

/** "Day 1 · Day 2 …" over the map. Clicking a day plays its route. */
export function DayButtons({ days, active, onPick }: { days: Day[]; active?: number; onPick: (i: number) => void }) {
  const base = "shrink-0 rounded-full border px-3 py-1 text-sm font-semibold shadow-sm transition";
  return (
    <div className="absolute inset-x-2 top-2 z-[1100] flex gap-2 overflow-x-auto pb-1" role="toolbar" aria-label="Show a day on the map">
      {days.map((d, i) => {
        const color = DAY_COLORS[i % DAY_COLORS.length];
        const on = active === i;
        return (
          <button
            key={d.date}
            type="button"
            onClick={() => onPick(i)}
            title={`${dayLabel(d.date)} · ${d.title}`}
            aria-pressed={on}
            className={`${base} flex items-center gap-1.5 ${on ? "text-white" : "bg-white text-ink hover:opacity-90"}`}
            style={on ? { background: color, borderColor: color } : { borderColor: color }}
          >
            {!on && <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />}
            Day {i + 1}
            <span className={`font-normal ${on ? "text-white/80" : "text-muted"}`}>· {dayLabel(d.date).split(" ")[0]}</span>
          </button>
        );
      })}
    </div>
  );
}
