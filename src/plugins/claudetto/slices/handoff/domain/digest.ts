// The prompt of the completion that writes the handoff when there is nothing to fork, such as after a resume (design D3).
// A completion reads no prompt cache, so the full messages cost more than the built-in compaction (`handoff-cost-301.md`).
// The prompt has a digest of the messages that is at most `DIGEST_TOKENS_MAX` tokens:
// each text and each tool call, and each tool result whole when all of them fit.
// When they do not fit, each result that is smaller than an equal share of the room stays whole,
// and each other result keeps its first line, its last line, each labeled line, such as `port: 8080`,
// and lines from its start and its end in its share.
// The labeled lines stay, because the handoff copies the exact values with their labels (`handoff-retention-301.md`).
// After the session, the prompt gives the labeled lines of the cut results again,
// because in a digest of 15,000 tokens the completion did not copy one of them (`resume2`).
// `null` when the digest does not fit with the cut results, and then the built-in compaction runs.
// The functions are pure and import only `limits.ts` and `compact.ts`.

import type { SessionMessage, ToolUseSummary } from "claude-code";
import {
  CALL_INPUT_CHARS_MAX,
  CHARS_PER_TOKEN,
  DIGEST_TEXT_CHARS_MAX,
  DIGEST_TOKENS_MAX,
} from "../limits.ts";
import {
  CUT_NOTE,
  DIGEST_INTRO,
  LABELED_LINES_INTRO,
  RULES,
} from "../prompts.ts";

/** A line with a label and a value in any script, such as `Nazwa użytkownika: ola`, also after the line number of a `Read` result, such as `   300→KEY-1: cobalt-otter-17`. */
const LABELED = /^\s*(\d+[\t→]\s*)?\p{L}[\p{L}\p{N}_ .-]{0,40}:\s+\S/u;

/** The characters of the notes of one cut result, such as `[298 lines not shown]`, at most two notes with room to spare. */
const NOTES_CHARS = 64;

/** `text` cut to `max` characters, with `...` at the cut. */
const cut = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max)}...` : text;

/** The result text of `use`: its own text, or the text of the result with its id in the messages. */
const resultOf = (
  use: ToolUseSummary,
  messages: readonly SessionMessage[],
): string => {
  if (use.text !== undefined) return use.text;
  for (const message of messages)
    for (const result of message.toolResults ?? [])
      if (result.tool_use_id === use.tool_use_id) return result.text;
  return "";
};

/**
 * The lines of `text` in about `share` characters: the first line, the last line, each labeled line,
 * and then lines from the start and from the end while they fit, with a note for each run of lines that is not kept.
 */
export const keptLines = (text: string, share: number): string => {
  const lines = text.split("\n");
  const kept = lines.map(
    (line, i) => i === 0 || i === lines.length - 1 || LABELED.test(line),
  );
  let used = lines.reduce((sum, l, i) => sum + (kept[i] ? l.length + 1 : 0), 0);
  let head = 1;
  let tail = lines.length - 2;
  // Two lines from the start for each line from the end, because the start of a file or a log names what follows.
  for (let turn = 0; head <= tail; turn++) {
    const i = turn % 3 === 2 ? tail-- : head++;
    if (kept[i]) continue;
    const size = (lines[i] as string).length + 1;
    if (used + size > share) break;
    kept[i] = true;
    used += size;
  }
  const out: string[] = [];
  let skipped = 0;
  lines.forEach((line, i) => {
    if (!kept[i]) skipped++;
    else {
      if (skipped > 0) out.push(`[${skipped} lines not shown]`);
      skipped = 0;
      out.push(line);
    }
  });
  if (skipped > 0) out.push(`[${skipped} lines not shown]`);
  return out.join("\n");
};

/**
 * The most characters of one result, so that the results fit in `room` characters:
 * each result that is smaller than an equal share stays whole, and the others share the rest.
 */
export const resultShare = (sizes: readonly number[], room: number): number => {
  const sorted = [...sizes].sort((x, y) => x - y);
  let left = room;
  for (const [i, size] of sorted.entries()) {
    const share = Math.floor(left / (sorted.length - i));
    if (size > share) return share;
    left -= size;
  }
  return Number.POSITIVE_INFINITY;
};

/** One tool call as `Call: Tool {input}`, with the input cut to `CALL_INPUT_CHARS_MAX` characters. */
const callLine = (use: ToolUseSummary): string =>
  `Call: ${use.tool} ${cut(JSON.stringify(use.input ?? null), CALL_INPUT_CHARS_MAX)}`;

/** The digest of `messages`, with each result as `shown` gives it. */
const render = (
  messages: readonly SessionMessage[],
  shown: (text: string) => string,
): string => {
  const parts: string[] = [];
  for (const message of messages) {
    const who = message.role === "user" ? "User" : "Assistant";
    if (message.text !== "")
      parts.push(`${who}: ${cut(message.text, DIGEST_TEXT_CHARS_MAX)}`);
    for (const use of message.toolUses) {
      const label = use.isError ? "Error" : "Result";
      parts.push(callLine(use), `${label}:\n${shown(resultOf(use, messages))}`);
    }
  }
  return parts.join("\n\n");
};

/** The labeled lines of each result of `messages` that is longer than `share`, under its call, or `""` when there are none. */
const labeledLines = (
  messages: readonly SessionMessage[],
  share: number,
): string => {
  const parts: string[] = [];
  for (const message of messages)
    for (const use of message.toolUses) {
      const text = resultOf(use, messages);
      if (text.length <= share) continue;
      const lines = text.split("\n").filter((line) => LABELED.test(line));
      if (lines.length > 0) parts.push(callLine(use), ...lines);
    }
  if (parts.length === 0) return "";
  return ["", LABELED_LINES_INTRO, "", ...parts].join("\n");
};

/**
 * The prompt of the completion: the handoff rules and the digest of `messages` in a `<session>` block.
 * `null` when the digest is more than `DIGEST_TOKENS_MAX` tokens also with the cut results.
 */
export const digestPrompt = (
  messages: readonly SessionMessage[],
): string | null => {
  const max = DIGEST_TOKENS_MAX * CHARS_PER_TOKEN;
  const sizes = messages.flatMap((m) =>
    m.toolUses.map((use) => resultOf(use, messages).length),
  );
  // The room for the results, less the notes of the lines that are not shown and the list of the labeled lines.
  // A smaller room cuts more results, so the list comes again from the final share.
  const room =
    max - render(messages, () => "").length - NOTES_CHARS * sizes.length;
  const first = labeledLines(messages, resultShare(sizes, room));
  const share = resultShare(sizes, room - first.length);
  const labeled = labeledLines(messages, share);
  const digest = render(messages, (text) =>
    text.length <= share ? text : keptLines(text, share),
  );
  if (digest.length + labeled.length > max) return null;
  const isCut = sizes.some((size) => size > share);
  return [
    DIGEST_INTRO,
    ...(isCut ? [CUT_NOTE] : []),
    "",
    "<session>",
    digest,
    "</session>",
    labeled,
    "",
    RULES,
  ].join("\n");
};
