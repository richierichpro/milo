import { readFile } from "node:fs/promises";
import { Milo } from "@/components/Milo";
import { isClaudeDemo } from "@/lib/claude";
import { isDemoMode } from "@/lib/serpapi";

// Read the env on each request so the demo banner reflects how the server was started.
export const dynamic = "force-dynamic";

async function recordedOn(): Promise<string | undefined> {
  try {
    const meta = JSON.parse(await readFile("demo-data/meta.json", "utf8")) as { recordedAt: string };
    return new Date(meta.recordedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return undefined;
  }
}

export default async function Home() {
  const demo = isDemoMode() || isClaudeDemo();
  return (
    <div className="flex min-h-screen flex-col lg:h-screen">
      {demo && (
        <div className="bg-marigold px-4 py-1 text-center text-sm font-semibold text-ink">
          Demo mode · real search data recorded on {(await recordedOn()) ?? "an earlier run"}
        </div>
      )}
      <Milo />
    </div>
  );
}
