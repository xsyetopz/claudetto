// The log of each `ask` of the gate, for question Q1 of change `0-3-0`: one JSON line with the time, the tool, the target, the reason, and who decided.

/** Who settled an `ask`: Jev, which allowed it, or a person, who saw the dialog. */
export type Decider = "jev" | "person";

export const logPath = (tmp: string, id: string): string =>
  `${tmp}/claudetto/gate/${id}.jsonl`;

export const logLine = (v: {
  at: number;
  tool: string;
  input: unknown;
  reason: string;
  decider: Decider;
}): string => {
  const f = (v.input ?? {}) as Record<string, unknown>;
  const target = f["command"] ?? f["file_path"] ?? f["path"];
  const { tool, reason, decider } = v;
  return `${JSON.stringify({
    at: new Date(v.at).toISOString(),
    tool,
    target: typeof target === "string" ? target : "",
    reason,
    decider,
  })}\n`;
};
