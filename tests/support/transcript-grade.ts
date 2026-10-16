// Applies the graders of an eval case to a recorded transcript.
// A transcript is `{ events, files }`: the stream-json events of a run, and the files that the run left.
// It supports the grader types `regex` and `tool_used`, which the agent evals use.
// It skips the grader type `llm`, because a judge needs a model.
// The default `min` of a `tool_used` grader is 1, which is an assumption of this helper.

/** A grader of a case file, as the YAML holds it. */
export type Grader = {
  name: string;
  type: string;
  target?: string | { source: string; path: string };
  pattern?: string;
  flags?: string;
  tool?: string;
  input_match?: string;
  min?: number;
  max?: number;
};

/** A recorded run. */
export type Transcript = {
  events: {
    type: string;
    result?: string;
    message?: { content?: { type: string; name?: string; input?: unknown }[] };
  }[];
  files: Record<string, string>;
};

/** The names of the graders that fail on a transcript. */
export const failedGraders = (graders: Grader[], run: Transcript): string[] => {
  const calls = run.events.flatMap((e) =>
    (e.message?.content ?? []).filter((b) => b.type === "tool_use"),
  );
  const last = run.events.findLast((e) => e.type === "result")?.result ?? "";
  return graders
    .filter((g) => {
      if (g.type === "llm") return false;
      if (g.type === "regex") {
        const text =
          typeof g.target === "object"
            ? (run.files[g.target.path] ?? "")
            : last;
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
