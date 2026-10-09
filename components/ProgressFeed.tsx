export function ProgressFeed({ lines, running }: { lines: string[]; running: boolean }) {
  if (!lines.length) return null;
  return (
    <ol className="space-y-1 rounded-2xl bg-white/70 p-3 text-sm">
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
  );
}
