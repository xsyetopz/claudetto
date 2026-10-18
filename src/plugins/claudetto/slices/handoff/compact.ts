// The rules of the handoff compaction (design D3, spec `handoff`):
// the prompt of the fork, the test that a reply is a handoff, the path of the handoff file, the message that hands it over,
// and the new context: one user message with the text of the first user message and the handoff, and the tail.
// The tail is each message from the last assistant message with a tool use to the end,
// because a fork does not see the newest tool result (`handoff-eval-300.md`, `p4`).
// Claude Code keeps each block of one reply as its own assistant message,
// so the tail starts at the first assistant message of that run, and no tool result loses its call (`handoff-p-301.md`).
// When the last message is an assistant reply with no tool use, the turn has ended, the fork saw each result,
// and there is no tail, so a manual compaction between two turns keeps no large tool result (`handoff-cost-301.md`).
// The fork does not see the tool calls of the tail either, so its prompt names them,
// or the handoff gives the newest call as not started, and the model runs it again (`handoff-cost-301.md`).
// When the new context is not below the trigger, there is no new context, and Claude Code compacts as built in.
// The functions are pure and import only `limits.ts` and the kernel.

import type { SessionMessage, ToolUseSummary } from "claude-code";
import {
  HAIKU_HANDOFF_TRIGGER_TOKENS,
  HANDOFF_TRIGGER_TOKENS,
} from "../../../../kernel/budget.ts";
import {
  changeHandoffPath,
  type OpenChange,
} from "../../../../kernel/change.ts";
import { HANDOFF_DIR } from "../../../../kernel/paths.ts";
import { CALL_INPUT_CHARS_MAX, CHARS_PER_TOKEN } from "./limits.ts";
import {
  CHANGE_HEADER,
  FIRST_MESSAGE,
  FORK_TAIL,
  GROUND_WARNING,
  HANDED,
  RULES,
} from "./prompts.ts";

/** The warning at the end of the handed message for the quoted values `missing`. */
const groundWarning = (missing: readonly string[]): string =>
  GROUND_WARNING({ values: missing.map((v) => `\`${v}\``).join(", ") });

/** One tool call as one list item: the tool and its input as JSON, cut to `CALL_INPUT_CHARS_MAX` characters. */
const callLine = (use: ToolUseSummary): string => {
  const input = JSON.stringify(use.input ?? null);
  const cut =
    input.length > CALL_INPUT_CHARS_MAX
      ? `${input.slice(0, CALL_INPUT_CHARS_MAX)}...`
      : input;
  return `- ${use.tool} ${cut}`;
};

/**
 * The prompt of the fork that writes the handoff of `messages`.
 * When the tail starts with tool calls, the prompt names them, says that their results stay in the context, and asks to mark them `RAN`.
 * `DONE` would read as a success, and the fork cannot know the outcome: in a TUI run the guard had denied such a call (`sandbox-handoff-301.md`).
 */
export const forkPrompt = (messages: readonly SessionMessage[]): string => {
  const calls = replyUses(messages.slice(tailStart(messages)));
  if (calls.length === 0) return RULES;
  return FORK_TAIL({ rules: RULES, calls: calls.map(callLine).join("\n") });
};

/**
 * True when `text` has a value in backticks on one line.
 * Each good handoff quotes values, and a text with no quoted value is not a handoff,
 * such as a fork that tried a tool and wrote about the error (`handoff-modes-300.md`).
 */
export const isHandoff = (text: string): boolean => /`[^`\n]+`/.test(text);

/**
 * The path of a new handoff file from the project root.
 * With an open openspec change it is `openspec/changes/<name>/handoff.md`.
 * Otherwise it has the UTC time in its name: `handoff-20261015T101010Z.md`.
 */
export const handoffPath = (
  now: Date,
  change: OpenChange | null = null,
): string => {
  if (change !== null) return changeHandoffPath(change.name);
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  return `${HANDOFF_DIR}/handoff-${stamp}.md`;
};

/**
 * The text of the handoff file with the open openspec change at its start: the change folder, the next open task,
 * the passed `checks` of the session, and the rule that a checked task is done and verified.
 * With no change, the text stays as it is.
 */
export const withChange = (
  text: string,
  change: OpenChange | null,
  checks: readonly string[] = [],
): string =>
  change === null
    ? text
    : [
        CHANGE_HEADER({
          name: change.name,
          next: change.next,
          done:
            change.done.length === 0
              ? "none"
              : change.done.map((id) => `\`${id}\``).join(", "),
          checks:
            checks.length === 0
              ? "none"
              : checks.map((c) => `\`${c}\``).join(", "),
        }),
        "",
        text,
      ].join("\n");

/**
 * The text of the user message that hands over `text`, the content of the file at `path`,
 * with the warning of the ground check for the values `missing` at its end.
 */
export const handedText = (
  path: string,
  text: string,
  missing: readonly string[] = [],
): string =>
  [
    HANDED({ path }),
    "",
    // The text of the file ends with a newline, so the warning has one blank line before it.
    text,
    ...(missing.length === 0 ? [] : [groundWarning(missing)]),
  ].join("\n");

/**
 * The index of the first message of the tail, or the length of `messages` when there is no tail:
 * the turn has ended with an assistant reply, or no assistant message after the first one has a tool use.
 * The tail starts at the first of the assistant messages before the last tool use, which are the blocks of one reply.
 */
const tailStart = (messages: readonly SessionMessage[]): number => {
  const last = messages.at(-1);
  if (last?.role === "assistant" && last.toolUses.length === 0)
    return messages.length;
  for (let i = messages.length - 1; i > 0; i--) {
    const message = messages[i] as SessionMessage;
    if (message.role !== "assistant" || message.toolUses.length === 0) continue;
    while (i > 1 && messages[i - 1]?.role === "assistant") i--;
    return i;
  }
  return messages.length;
};

/** The tool uses of the first reply of `tail`: its assistant messages before the first user message. */
const replyUses = (tail: readonly SessionMessage[]): ToolUseSummary[] => {
  const end = tail.findIndex((message) => message.role !== "assistant");
  return tail
    .slice(0, end === -1 ? tail.length : end)
    .flatMap((message) => message.toolUses);
};

/** The context in tokens at which the auto compaction of `model` starts: the Haiku bound for a Haiku model, and otherwise the bound of the other models. */
export const triggerTokens = (model: string): number =>
  /haiku/i.test(model) ? HAIKU_HANDOFF_TRIGGER_TOKENS : HANDOFF_TRIGGER_TOKENS;

/** The estimated tokens of a message: its text, and the input and the result text of each tool use, over `CHARS_PER_TOKEN`. */
const messageTokens = (message: SessionMessage): number => {
  const tools = message.toolUses.reduce(
    (sum, use) =>
      sum + JSON.stringify(use.input ?? null).length + (use.text?.length ?? 0),
    0,
  );
  return Math.ceil((message.text.length + tools) / CHARS_PER_TOKEN);
};

const contextTokens = (messages: readonly SessionMessage[]): number =>
  messages.reduce((sum, message) => sum + messageTokens(message), 0);

/**
 * The text of the first user message before an earlier compaction: the text in `message` with the wrapper of that compaction taken off.
 * After a compaction the first user message holds the earlier handoff, which the new handoff updates and does not stack (design D46).
 */
const originalFirst = (message: string): string => {
  const [lead = "", mid = ""] = FIRST_MESSAGE({
    first: "\0",
    handed: "\0",
  }).split("\0");
  const handed = HANDED({ path: "\0" }).split("\0")[0] as string;
  if (message.startsWith(handed)) return "";
  if (!message.startsWith(lead)) return message;
  const body = message.slice(lead.length);
  const end = body.indexOf(`${mid}${handed}`);
  return end === -1 ? message : body.slice(0, end);
};

/** The text of the one user message after a compaction: the text of the first user message `first`, then `handed`. */
const headText = (first: string, handed: string): string =>
  first === "" ? handed : FIRST_MESSAGE({ first, handed });

/**
 * The context after the handoff: one user message with the text of the first user message before the tail and `handed`, and the tail.
 * Claude Code sends each message that a hook gives back to the output again, and `num_turns` counts each user message there,
 * so one user message in place of two removes one turn for each compaction (`handoff-turns-301.md`).
 * The tail has the messages of the engine, each with its `handle`.
 * `null` when this context is not below `trigger` tokens.
 */
export const compactedMessages = (
  messages: readonly SessionMessage[],
  handed: string,
  trigger: number,
): SessionMessage[] | null => {
  const cut = tailStart(messages);
  const first = messages.slice(0, cut).find((m) => m.role === "user");
  const head: SessionMessage[] = [
    {
      role: "user",
      text: headText(originalFirst(first?.text ?? ""), handed),
      toolUses: [],
    },
  ];
  const context = [...head, ...messages.slice(cut)];
  return contextTokens(context) < trigger ? context : null;
};

/** `text` with a `>` line in place of the blank lines between two quoted lines. */
export const joinQuotes = (text: string): string =>
  text.replace(/^([ \t]*>.*)\n(?:[ \t]*\n)+(?=([ \t]*)>)/gm, "$1\n$2>\n");

/**
 * `text` of the model with each `DONE` mark taken off.
 * The status of a step comes from the checked tasks of `tasks.md` and from passed checks, not from the model text (design D48).
 */
export const statusFree = (text: string): string =>
  text.replace(/[ \t]*\bDONE\b[,:]?/g, "");
