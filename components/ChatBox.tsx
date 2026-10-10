"use client";

import { useState } from "react";
import { formatINR } from "@/lib/money";
import { friendlyStep } from "./ProgressFeed";

export type ChatTurn =
  | { role: "user"; text: string }
  | { role: "milo"; text: string; tools: string[]; delta?: number; pending?: boolean; error?: boolean };

const SUGGESTIONS = ["Make it cheaper", "Kabir can't leave Delhi before 6pm Friday", "Add a sunset cruise", "Make day 2 more adventurous"];

export function ChatBox({ turns, busy, onSend }: { turns: ChatTurn[]; busy: boolean; onSend: (text: string) => void }) {
  const [text, setText] = useState("");
  const send = (t: string) => {
    if (!t.trim() || busy) return;
    onSend(t.trim());
    setText("");
  };

  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl">Change anything</h2>
      <div className="space-y-2">
        {turns.map((t, i) =>
          t.role === "user" ? (
            <p key={i} className="ml-8 rounded-2xl rounded-br-sm bg-teal px-3 py-2 text-sm text-white">
              {t.text}
            </p>
          ) : (
            <div key={i} className={`mr-4 rounded-2xl rounded-bl-sm border px-3 py-2 text-sm ${t.error ? "border-coral/40 bg-coral/10" : "border-line bg-white"}`}>
              {t.pending && (
                <p className="flex items-center gap-2 text-xs text-muted">
                  <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-teal border-t-transparent" />
                  {t.tools.length ? friendlyStep(t.tools[t.tools.length - 1]) : "Thinking…"}
                </p>
              )}
              {t.text && <p>{t.text}</p>}
              {t.delta !== undefined && t.delta !== 0 && (
                <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${t.delta < 0 ? "bg-ok/10 text-ok" : "bg-coral/10 text-coral"}`}>
                  {t.delta < 0 ? "−" : "+"}
                  {formatINR(Math.abs(t.delta))} per person
                </span>
              )}
            </div>
          ),
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={busy}
            onClick={() => send(s)}
            className="rounded-full border border-line bg-white px-3 py-1 text-xs hover:border-teal disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={busy}
          placeholder="Ask Milo to change something…"
          className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-teal disabled:opacity-60"
        />
        <button disabled={busy || !text.trim()} className="rounded-xl bg-teal px-4 text-sm font-semibold text-white disabled:opacity-50">
          Send
        </button>
      </form>
    </section>
  );
}
