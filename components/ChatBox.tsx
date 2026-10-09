"use client";

export function ChatBox({ disabled }: { disabled?: boolean }) {
  return (
    <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
      <input
        disabled={disabled}
        placeholder={disabled ? "Chat edits are coming soon" : "Ask Pakka to change something…"}
        className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm disabled:opacity-60"
      />
      <button disabled={disabled} className="rounded-xl bg-teal px-4 text-sm font-semibold text-white disabled:opacity-50">
        Send
      </button>
    </form>
  );
}
