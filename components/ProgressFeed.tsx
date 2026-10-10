/** Turns the server's step messages into one friendly line; search details stay hidden. */
export function friendlyStep(text: string): string {
  if (/flight|land together|lining up/i.test(text)) return "Finding flights for everyone…";
  if (/hotel/i.test(text)) return "Finding a place to stay…";
  if (/maps|places/i.test(text)) return "Finding things to do and places to eat…";
  if (/event/i.test(text)) return "Checking what's on…";
  if (/ticket|price/i.test(text)) return "Checking ticket prices…";
  if (/checking every item|verif/i.test(text)) return "Double-checking everything…";
  if (/claude|arrang|fix|reconsider/i.test(text)) return "Putting your days together…";
  return "Planning your trip…";
}

/** A single status line while planning; nothing once the plan is ready. */
export function ProgressFeed({ lines, running }: { lines: string[]; running: boolean }) {
  if (!running) return null;
  const last = lines.at(-1);
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-white/70 p-3 text-sm" role="status" aria-live="polite">
      <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-teal border-t-transparent" />
      <span>{last ? friendlyStep(last) : "Planning your trip…"}</span>
    </div>
  );
}
