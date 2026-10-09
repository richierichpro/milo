import type { Verification } from "@/lib/types";

export function VerifiedBadge({ v }: { v: Verification }) {
  const ok = v.verified === v.total;
  const removed = v.removed.length;
  return (
    <span className="group relative inline-block" tabIndex={0}>
      <span className={`cursor-help rounded-full px-3 py-1 text-sm font-semibold ${ok ? "bg-ok/10 text-ok" : "bg-coral/10 text-coral"}`}>
        ✓ {v.verified}/{v.total} verified with live Google data
      </span>
      <span className="pointer-events-none absolute left-0 top-full z-[500] mt-2 w-72 rounded-xl bg-ink p-3 text-xs leading-relaxed text-white opacity-0 shadow-lg transition group-hover:opacity-100 group-focus:opacity-100">
        Every flight, hotel, place and event comes from a live SerpApi result. Claude arranges them and can&apos;t add its own.
        {removed > 0 && (
          <>
            {" "}
            {removed} suggestion{removed === 1 ? " was" : "s were"} removed because search didn&apos;t return {removed === 1 ? "it" : "them"}.
          </>
        )}
      </span>
    </span>
  );
}
