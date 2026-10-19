// Applies the graders of an eval case to a recorded transcript.
// A transcript is `{ events, files }`: the stream-json events of a run, and the files that the run left.
// It supports the grader types `regex` and `tool_used`, which the agent evals use.
// It skips the grader type `llm`, because a judge needs a model.
// `graderFaults` lists each grader type or field that it does not model, and `failedGraders` throws on them, so a grader never passes or fails by a guess.
// The default `min` of a `tool_used` grader is 1, which is an assumption of this helper.
// It also counts the tool calls and the tokens of a run, for the budget tags of a case (D25).

/** A grader of a case file, as the YAML holds it. */
export type Grader = {
  name: string;
  type: string;
  target?: { source: string; path: string };
  pattern?: string;
  flags?: string;
  tool?: string;
  input_match?: string;
  min?: number;
  max?: number;
};

/** A recorded run. A bad run also names the grader that it must fail, in `fails`. */
export type Transcript = {
  fails?: string;
  events: {
    type: string;
    result?: string;
    usage?: { input_tokens?: number; output_tokens?: number };
    message?: { content?: { type: string; name?: string; input?: unknown }[] };
  }[];
  files: Record<string, string>;
};

/** The fields that each grader type models. A field outside the list is a fault of `graderFaults`. */
const FIELDS: Record<string, string[]> = {
  regex: ["target", "pattern", "flags"],
  tool_used: ["tool", "input_match", "min", "max"],
  llm: ["criteria", "focus"],
};

/** The faults of the graders that this helper does not model, or that miss a field it needs. */
export const graderFaults = (graders: Grader[]): string[] => {
  const out: string[] = [];
  for (const g of graders) {
    const known = FIELDS[g.type];
    if (!known) {
      out.push(`grader ${g.name}: unmodelled type ${g.type}`);
      continue;
    }
    for (const k of Object.keys(g))
      if (k !== "name" && k !== "type" && !known.includes(k))
        out.push(`grader ${g.name}: unmodelled field ${k}`);
    const t = g.target as unknown;
    if (
      t !== undefined &&
      (typeof t !== "object" ||
        t === null ||
        (t as { source?: string }).source !== "file")
    )
      out.push(`grader ${g.name}: unmodelled target`);
    if (g.type === "regex" && typeof g.pattern !== "string")
      out.push(`grader ${g.name}: a regex grader needs a pattern`);
    if (g.type === "tool_used" && typeof g.tool !== "string")
      out.push(`grader ${g.name}: a tool_used grader needs a tool`);
  }
  return out;
};

/** The names of the graders that fail on a transcript. */
export const failedGraders = (graders: Grader[], run: Transcript): string[] => {
  const faults = graderFaults(graders);
  if (faults.length) throw new Error(faults.join("\n"));
  const calls = run.events.flatMap((e) =>
    (e.message?.content ?? []).filter((b) => b.type === "tool_use"),
  );
  const last = run.events.findLast((e) => e.type === "result")?.result ?? "";
  return graders
    .filter((g) => {
      if (g.type === "llm") return false;
      if (g.type === "regex") {
        const text =
          g.target === undefined ? last : (run.files[g.target.path] ?? "");
        return !new RegExp(g.pattern as string, g.flags ?? "").test(text);
      }
      const match = g.input_match ? new RegExp(g.input_match) : undefined;
      const n = calls.filter(
        (c) =>
          c.name === g.tool && (!match || match.test(JSON.stringify(c.input))),
      ).length;
      return n < (g.min ?? 1) || n > (g.max ?? Number.POSITIVE_INFINITY);
    })
    .map((g) => g.name);
};

/** The tool calls of a run. */
export const toolCalls = (run: Transcript): number =>
  run.events.flatMap((e) =>
    (e.message?.content ?? []).filter((b) => b.type === "tool_use"),
  ).length;

/** The input and output tokens of a run, from the `usage` of its `result` event, or `undefined` when it has none. */
export const runTokens = (run: Transcript): number | undefined => {
  const u = run.events.findLast((e) => e.type === "result")?.usage;
  return u === undefined
    ? undefined
    : (u.input_tokens ?? 0) + (u.output_tokens ?? 0);
};
