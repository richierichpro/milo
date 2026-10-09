"use client";

import { dayLabel, DAY_COLORS } from "@/lib/format";
import type { Day } from "@/lib/types";
import { StopCard } from "./StopCard";

export function DayTimeline({
  days,
  selectedId,
  highlightIds,
  activeDay,
  onDayClick,
  onSelect,
}: {
  days: Day[];
  selectedId?: string;
  highlightIds?: Set<string>;
  activeDay?: number;
  onDayClick?: (index: number) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="space-y-6">
      {days.map((day, i) => (
        <div key={day.date}>
          <h3 className="mb-2">
            <button
              type="button"
              onClick={() => onDayClick?.(i)}
              aria-pressed={activeDay === i}
              title={activeDay === i ? "Show all days on the map" : "Show this day on the map"}
              className={`flex items-center gap-2 rounded-lg text-left font-display text-xl transition hover:opacity-80 ${
                activeDay !== undefined && activeDay !== i ? "opacity-50" : ""
              }`}
            >
              <span className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: DAY_COLORS[i % DAY_COLORS.length] }} />
              <span>
                Day {i + 1} · {dayLabel(day.date)} · <span className="text-teal">{day.title}</span>
              </span>
            </button>
          </h3>
          {day.approxKm !== undefined && <p className="-mt-1 mb-2 pl-5 text-xs text-muted">≈ {day.approxKm} km today (approximate)</p>}
          {day.stops.length ? (
            <div className="space-y-2 border-l-2 border-dashed border-line pl-3">
              {day.stops.map((s, j) => (
                <StopCard
                  key={s.item.id}
                  stop={s}
                  index={j}
                  color={DAY_COLORS[i % DAY_COLORS.length]}
                  selected={selectedId === s.item.id}
                  highlighted={highlightIds?.has(s.item.id)}
                  onSelect={() => onSelect(s.item.id)}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-line p-3 text-sm text-muted">
              {i === 0 ? "Travel day: the squad is still landing." : i === days.length - 1 ? "Travel day: heading home." : "Nothing planned."}
            </p>
          )}
        </div>
      ))}
    </section>
  );
}
