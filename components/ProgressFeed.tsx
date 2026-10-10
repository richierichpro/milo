"use client";

import { useState } from "react";

export function ProgressFeed({ lines, running }: { lines: string[]; running: boolean }) {
  const [open, setOpen] = useState(false);
  if (!lines.length) return null;
  const collapsed = !running && !open;

  return (
    <div className="rounded-2xl bg-white/70 p-3 text-sm">
      {!running && (
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left font-semibold text-ok" aria-expanded={open}>
          <span>✓ Your plan is ready</span>
          <span className="text-xs font-normal text-muted">{open ? "Hide steps" : "Show steps"}</span>
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
