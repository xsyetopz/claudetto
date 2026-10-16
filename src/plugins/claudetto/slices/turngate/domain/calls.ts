// The summary of the tool calls of one turn, which the judge reads in place of the transcript.
// Each line gives the tool, the target, and the outcome: `ok`, `ok, read-only`, or the first line of the error.
// The order of the lines is the order of the calls, so the judge sees whether a check ran after the last edit.

import { MAX_CALLS, MAX_ERROR_CHARS, MAX_TARGET_CHARS } from "../limits.ts";

/** One tool call of a turn, as the summary gives it. */
export interface CallLine {
  readonly tool: string;
  readonly target: string;
  /** `undefined` when the call had no error. */
  readonly error?: string;
  readonly isReadOnly: boolean;
}

/** The input fields that name the target of a call, in order of preference. */
const TARGET_KEYS = [
  "command",
  "file_path",
  "notebook_path",
  "path",
  "pattern",
  "url",
  "query",
  "subagent_type",
  "skill",
  "task_id",
] as const;

/** `text` cut to its first line and to `max` characters. */
const clip = (text: string, max: number): string => {
  const line = text.trim().split("\n")[0] ?? "";
  return line.length > max ? `${line.slice(0, max)}…` : line;
};

/** The target of a call: the first input field of `TARGET_KEYS` that is a string. */
export const targetOf = (input: Readonly<Record<string, unknown>>): string => {
  for (const key of TARGET_KEYS) {
    const value = input[key];
    if (typeof value === "string" && value.trim() !== "")
      return clip(value, MAX_TARGET_CHARS);
  }
  return "";
};

/** The outcome of a call that the engine gives to a `tool.call` hook after `next`. */
export interface CallOutcome {
  readonly deny?: string | undefined;
  readonly isError?: true | undefined;
  readonly text?: string | undefined;
  readonly isReadOnly?: boolean | undefined;
}

/** The summary line of one call. A deny is an error, with its reason. */
export const callLine = (
  tool: string,
  input: Readonly<Record<string, unknown>>,
  out: CallOutcome,
): CallLine => {
  const target = targetOf(input);
  if (out.deny !== undefined)
    return {
      tool,
      target,
      error: `denied: ${clip(out.deny, MAX_ERROR_CHARS)}`,
      isReadOnly: false,
    };
  if (out.isError)
    return {
      tool,
      target,
      error: clip(out.text ?? "error", MAX_ERROR_CHARS) || "error",
      isReadOnly: false,
    };
  return { tool, target, isReadOnly: out.isReadOnly === true };
};

/** The text of one line, with the target in backticks. */
const lineText = (c: CallLine, n: number): string => {
  const target = c.target ? ` \`${c.target.replaceAll("`", "'")}\`` : "";
  const outcome =
    c.error !== undefined
      ? `error: ${c.error}`
      : c.isReadOnly
        ? "ok, read-only"
        : "ok";
  return `${n}. ${c.tool}${target}: ${outcome}`;
};

/** The summary of the calls, in order. The last `MAX_CALLS` calls stay, because the last edit and the checks after it decide. */
export const summary = (calls: readonly CallLine[]): string => {
  const cut = Math.max(0, calls.length - MAX_CALLS);
  const lines = calls.slice(cut).map((c, i) => lineText(c, cut + i + 1));
  return cut > 0
    ? [`(${cut} earlier calls are not shown)`, ...lines].join("\n")
    : lines.join("\n");
};
