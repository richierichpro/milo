"use client";

import { useState } from "react";
import type { Itinerary } from "@/lib/types";
import { whatsappText } from "@/lib/whatsapp";

export function WhatsAppButton({ itinerary }: { itinerary: Itinerary }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(whatsappText(itinerary));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="rounded-full bg-[#25d366] px-3 py-1 text-sm font-semibold text-white hover:opacity-90"
    >
      {copied ? "Copied ✓" : "Copy for WhatsApp"}
    </button>
  );
}
