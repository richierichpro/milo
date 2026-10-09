"use client";

import { engineLabel } from "@/lib/format";
import type { CallLogEntry } from "@/lib/types";

const SOURCE_STYLE: Record<CallLogEntry["source"], string> = {
  live: "bg-ok/10 text-ok",
  cache: "bg-teal-soft text-teal",
  demo: "bg-marigold-soft text-ink",
};

export function receiptsSummary(receipts: CallLogEntry[]): string {
  const engines = new Set(receipts.map((r) => r.engine)).size;
  return `${receipts.length} search${receipts.length === 1 ? "" : "es"} · ${engines} Google engine${engines === 1 ? "" : "s"}`;
}

export function ReceiptsDrawer({ receipts, open, onClose }: { receipts: CallLogEntry[]; open: boolean; onClose: () => void }) {
  if (!open) return null;
  const counts = receipts.reduce<Record<string, number>>((m, r) => ({ ...m, [r.source]: (m[r.source] ?? 0) + 1 }), {});
  return (
    <div className="fixed inset-0 z-[1000] flex justify-end bg-ink/30" onClick={onClose} role="presentation">
      <aside
        className="flex h-full w-full max-w-md flex-col bg-sand shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Search receipts"
      >
        <header className="flex items-start justify-between border-b border-line p-4">
          <div>
            <h2 className="font-display text-2xl">Search receipts</h2>
            <p className="text-sm text-muted">
              {receiptsSummary(receipts)} ·{" "}
              {Object.entries(counts)
                .map(([k, v]) => `${v} ${k}`)
                .join(", ")}
            </p>
            <p className="mt-1 text-xs text-muted">Every SerpApi call behind this plan. “cache” means the same search was made earlier and saved on disk.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full px-2 text-xl text-muted hover:text-ink" aria-label="Close">
            ×
          </button>
        </header>
        <ol className="flex-1 divide-y divide-line overflow-y-auto">
          {receipts.map((r, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-2 text-sm">
              <span className="w-5 text-right text-xs text-muted">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{engineLabel(r.engine)}</p>
                <p className="truncate text-muted" title={r.summary}>
                  {r.summary}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SOURCE_STYLE[r.source]}`}>{r.source}</span>
              <span className="w-14 text-right text-xs text-muted">{r.ms < 1000 ? `${r.ms} ms` : `${(r.ms / 1000).toFixed(1)} s`}</span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
