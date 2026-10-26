// The handover (design D12 and D13, spec `handover`): the choice of the path, and the handoff text that code builds with no model call.

import type { SessionMessage } from "claude-code";
import { COMPACTION_OPTION } from "../domain/compaction.ts";
import { changedFiles, cut, quote } from "./cold.ts";
import { clip } from "./compact.ts";
import {
  type Case,
  COLD_PROMPTS_MAX,
  DECISIONS_MAX,
  HANDOVER_AGE_MS,
  HANDOVER_CONTEXT_TOKENS,
  PATH_TABLE,
  type Path,
  type PathRow,
  USER_VALUE_CHARS_MAX,
  USER_VALUES_MAX,
} from "./limits.ts";
import { HANDOVER } from "./prompts.ts";

/** `group` and `before` are the task groups of the next open task now and at the earlier turn end. */
interface TurnEnd {
  readonly tokens: number;
  readonly startedAt: number;
  readonly now: number;
  readonly group: string | null;
  readonly before: string | null;
}

/** The case that a quiet turn end starts, or `null` (triggers 1 and 3 of D12). */
export const caseOf = (end: TurnEnd): Case | null => {
  if (end.tokens > HANDOVER_CONTEXT_TOKENS) return "context";
  if (end.before !== null && end.group !== null && end.before !== end.group)
    return "group";
  return end.now - end.startedAt > HANDOVER_AGE_MS ? "age" : null;
};

/** The task group of a task id, such as `6` for `6.2`. */
export const groupOf = (id: string | null): string | null =>
  id === null ? null : (id.split(".")[0] ?? null);

const rowOf = (kind: Case, tokens: number, table: readonly PathRow[]) =>
  table.find((row) => row.case === kind && tokens <= row.tokensMax);

/** `built-in` starts no path, `handover` is always a handover, and `auto` reads the first matching row of `table`. */
export const pathOf = (
  kind: Case,
  tokens: number,
  option: unknown,
  table: readonly PathRow[] = PATH_TABLE,
): Path | null => {
  if (option === "built-in") return null;
  if (option === "handover") return "handover";
  return rowOf(kind, tokens, table)?.path ?? "handover";
};

/** The model of the first request step after a handover (spec `handover`, "Model at a Cold Start"), or `null` for the session model. */
export const modelOf = (
  kind: Case,
  tokens: number,
  table: readonly PathRow[] = PATH_TABLE,
): string | null => rowOf(kind, tokens, table)?.model ?? null;

/** One step of a path, in order: the handoff file, `/clear`, `/compact`, the resume prompt, and the held prompt of the user. */
export type Step = "write" | "clear" | "compact" | "resume" | "held";

/** The steps of `path` (spec `handover`, "Path by Measure"). The resume prompt of a handover already holds the held prompt. */
export const stepsOf = (path: Path, held: boolean): Step[] => {
  const after: Step[] = held ? ["held"] : [];
  if (path === "compact") return ["compact", ...after];
  if (path === "handoff-then-compact") return ["write", "compact", ...after];
  return ["write", "clear", "resume"];
};

/** The value of the `compaction` option in `options`, or `auto`. */
export const optionOf = (
  options: Readonly<Record<string, unknown>> | undefined,
): string => {
  const value = options?.[COMPACTION_OPTION];
  return value === "handover" || value === "built-in" ? value : "auto";
};

interface Decision {
  readonly question: string;
  readonly chosen: string;
  readonly ruledOut: readonly string[];
}

const ANSWER = /"((?:[^"\\]|\\.)*)"="((?:[^"\\]|\\.)*)"/g;

const labelsOf = (input: unknown, question: string): string[] => {
  const questions = (input as { questions?: unknown } | undefined)?.questions;
  if (!Array.isArray(questions)) return [];
  const found = questions.find(
    (q) => (q as { question?: unknown } | null)?.question === question,
  ) as { options?: unknown } | undefined;
  return Array.isArray(found?.options)
    ? found.options
        .map((o) => (o as { label?: unknown } | null)?.label)
        .filter((l): l is string => typeof l === "string")
    : [];
};

/**
 * The answered `AskUserQuestion` calls, in order, the newest `DECISIONS_MAX`.
 * The result text reads `User has answered your questions: "Q"="A".`, and an option other than the chosen ones is ruled out.
 */
export const decisionsOf = (messages: readonly SessionMessage[]): Decision[] =>
  messages
    .flatMap((m) => m.toolUses)
    .filter((use) => use.tool === "AskUserQuestion" && use.isError !== true)
    .flatMap((use) =>
      [...(use.text ?? "").matchAll(ANSWER)].map(
        ([, question = "", answer = ""]) => {
          const chosen = answer.split(", ");
          return {
            question,
            chosen: answer,
            ruledOut: labelsOf(use.input, question).filter(
              (label) => !chosen.includes(label) && label !== answer,
            ),
          };
        },
      ),
    )
    .slice(-DECISIONS_MAX);

/** The start of the text of a handover, up to its task. */
const MARK = HANDOVER({
  task: "\0",
  files: "",
  decisions: "",
  ruledOut: "",
  values: "",
  usage: "",
  words: "",
  earlier: "",
}).split("\0")[0] as string;

/** True when `text` holds an earlier handoff, as the resume prompt of a handover does. */
const isHandover = (text: string): boolean => text.includes(MARK);

/** The values in backticks of the user messages, each once, the newest `USER_VALUES_MAX`. A resume prompt is no message of the user. */
export const userValuesOf = (messages: readonly SessionMessage[]): string[] => {
  const values = new Set<string>();
  for (const m of messages)
    if (m.role === "user" && !isHandover(m.text))
      for (const [, value = ""] of m.text.matchAll(/`([^`\n]+)`/g))
        values.add(clip(value, USER_VALUE_CHARS_MAX));
  return [...values].slice(-USER_VALUES_MAX);
};

const code = (list: readonly string[]): string =>
  list.length === 0 ? "none" : list.map((v) => `\`${v}\``).join(", ");

/** The goal: the next open task line of the change, else the `Task:` line of the handover that this session resumed, else the first line of the first prompt of the user. */
const taskOf = (prompts: readonly string[], next: string | null): string => {
  const [head = "", ...rest] = prompts;
  const resumed = promptOf(/^Task: (.*)$/m.exec(head)?.[1] ?? "");
  const first = isHandover(head) ? (rest[0] ?? "") : head;
  const task =
    next?.replace(/^\s*- \[ \]\s*/, "") ??
    (resumed || first.trim().split("\n")[0]) ??
    "";
  return cut(task.trim());
};

/** The prompt of a user text: a slash command is `/name args`, and a command with no arguments or a local command note is `""`. A handoff stays whole. */
const promptOf = (text: string): string => {
  if (isHandover(text)) return text;
  const name = /<command-name>([^<]*)<\/command-name>/.exec(text)?.[1];
  const args = /<command-args>([^<]*)<\/command-args>/.exec(text)?.[1]?.trim();
  if (name !== undefined) return args ? `${name} ${args}` : "";
  return /^<local-command-[\w-]+>/.test(text.trim()) ? "" : text;
};

/** The text of a handover of `messages`, built in code with no model call. `usage` is the cost report of `costReport`, and `next` is the line of the next open task of the change. */
export const handoverText = (
  messages: readonly SessionMessage[],
  usage = "none",
  next: string | null = null,
): string => {
  const prompts = messages
    .filter((m) => m.role === "user")
    .map((m) => promptOf(m.text))
    .filter((text) => text.trim() !== "");
  const head = prompts[0] ?? "";
  const isResumed = isHandover(head);
  const decisions = decisionsOf(messages);
  const ruled = decisions.filter((d) => d.ruledOut.length > 0);
  return HANDOVER({
    task: taskOf(prompts, next),
    files: code(changedFiles(messages)),
    decisions:
      decisions.map((d) => `${d.question} \`${d.chosen}\``).join("; ") ||
      "none",
    ruledOut:
      ruled.map((d) => `${d.question} ${code(d.ruledOut)}`).join("; ") ||
      "none",
    values: code(userValuesOf(messages)),
    usage,
    words: quote(
      (isResumed ? prompts.slice(1) : prompts).slice(-COLD_PROMPTS_MAX),
    ),
    earlier: isResumed ? head.slice(head.indexOf(MARK)) : "none",
  });
};
