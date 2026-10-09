export function Rating({ rating, reviews }: { rating?: number; reviews?: number }) {
  if (!rating) return null;
  return (
    <span className="whitespace-nowrap text-sm">
      <span className="text-marigold">★</span> {rating.toFixed(1)}
      {reviews ? <span className="text-muted"> ({new Intl.NumberFormat("en-IN").format(reviews)})</span> : null}
    </span>
  );
}
