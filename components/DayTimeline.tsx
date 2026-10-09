"use client";

import { dayLabel, DAY_COLORS } from "@/lib/format";
import type { Day } from "@/lib/types";
import { StopCard } from "./StopCard";

export function DayTimeline({
  days,
  selectedId,
  highlightIds,
  onSelect,
}: {
  days: Day[];
  selectedId?: string;
  highlightIds?: Set<string>;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="space-y-6">
      {days.map((day, i) => (
        <div key={day.date}>
          <h3 className="mb-2 flex items-center gap-2 font-display text-xl">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: DAY_COLORS[i % DAY_COLORS.length] }} />
            Day {i + 1} · {dayLabel(day.date)} · <span className="text-teal">{day.title}</span>
          </h3>
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
