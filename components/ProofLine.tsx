"use client";

import { engineLabel, timeAgo } from "@/lib/format";
import { useNow } from "@/lib/useNow";
import type { Source } from "@/lib/types";

/** "Google Maps · checked 3 min ago ↗" */
export function ProofLine({ source, extra }: { source: Source; extra?: string }) {
  const now = useNow();
  const text = `${engineLabel(source.engine)}${extra ? ` · ${extra}` : ""} · checked ${timeAgo(source.fetchedAt, now)}`;
  return (
    <p className="mt-1 text-xs text-muted">
      {source.url ? (
        <a href={source.url} target="_blank" rel="noreferrer" className="hover:text-teal hover:underline" onClick={(e) => e.stopPropagation()}>
          {text} ↗
        </a>
      ) : (
        text
      )}
    </p>
  );
}
