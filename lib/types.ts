export type CallLogEntry = {
  engine: string;
  summary: string;
  source: "live" | "cache" | "demo";
  ms: number;
  at: string;
};
