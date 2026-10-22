// The log of each `ask` of the gate, for question Q1 of change `0-3-0` (task 5.2).
// One JSON line for each `ask`: the time, the tool, the command or path, the reason, and who decided.

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
  const fields = (v.input ?? {}) as Record<string, unknown>;
  const target = fields["command"] ?? fields["file_path"] ?? fields["path"];
  return `${JSON.stringify({
    at: new Date(v.at).toISOString(),
    tool: v.tool,
    target: typeof target === "string" ? target : "",
    reason: v.reason,
    decider: v.decider,
  })}\n`;
};
