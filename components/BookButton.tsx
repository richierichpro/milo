/** A pill link that opens a booking (or directions) page without selecting the card it sits on. */
export function BookButton({ href, children, primary = true }: { href?: string; children: React.ReactNode; primary?: boolean }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition ${
        primary ? "bg-teal text-white hover:bg-teal/90" : "border border-line bg-white text-ink hover:border-teal"
      }`}
    >
      {children} ↗
    </a>
  );
}
