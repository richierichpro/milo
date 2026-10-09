"use client";

import { useState } from "react";

/** Remote search thumbnails; falls back to a soft block if the image fails. */
export function Photo({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) return <div className={`bg-sand-deep ${className ?? ""}`} aria-hidden />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote search thumbnails from many hosts
    <img src={src} alt={alt} className={`object-cover ${className ?? ""}`} loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
  );
}
