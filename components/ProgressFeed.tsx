"use client";

import { useState } from "react";
import type { CallLogEntry } from "@/lib/types";

/** "✓ 16 live searches", "✓ 16 searches · 4 live, 12 cached" … */
function doneLabel(receipts: CallLogEntry[]): string {
  const n = receipts.length;
  const by = (s: CallLogEntry["source"]) => receipts.filter((r) => r.source === s).length;
  const parts = (["live", "cache", "demo"] as const).filter((s) => by(s)).map((s) => `${by(s)} ${s === "cache" ? "cached" : s}`);
  if (parts.length === 1) return `✓ ${n} ${parts[0].split(" ")[1]} search${n === 1 ? "" : "es"}`;
  return `✓ ${n} searches · ${parts.join(", ")}`;
}

export function ProgressFeed({ lines, running, receipts }: { lines: string[]; running: boolean; receipts: CallLogEntry[] }) {
  const [open, setOpen] = useState(false);
  if (!lines.length) return null;
  const collapsed = !running && !open;

  return (
    <div className="rounded-2xl bg-white/70 p-3 text-sm">
      {!running && (
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left font-semibold text-ok" aria-expanded={open}>
          <span>{receipts.length ? doneLabel(receipts) : `✓ ${lines.length} steps`}</span>
          <span className="text-xs font-normal text-muted">{open ? "Hide" : "Show"}</span>
        </button>
      )}
      {!collapsed && (
        <ol className={`space-y-1 ${running ? "" : "mt-2"}`}>
          {lines.map((line, i) => {
            const newest = running && i === lines.length - 1;
            return (
              <li key={i} className={`flex items-center gap-2 ${newest ? "text-ink" : "text-muted"}`}>
                {newest ? (
                  <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-teal border-t-transparent" />
                ) : (
                  <span className="w-3 shrink-0 text-center text-ok">✓</span>
                )}
                <span>{line}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
