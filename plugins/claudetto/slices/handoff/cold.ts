// The cold handoff (design D47): when the last turn is older than the prompt cache TTL, a fork would read the full history as uncached input,
// so the handoff holds only what needs no model: the task, the changed files, and the last words of the user.
// The next open task and the done list come from `withChange` in `compact.ts`.
// The functions are pure and import only `limits.ts` and the kernel.

import type { SessionMessage } from "claude-code";
import { clip, earlierHanded, originalFirst } from "./compact.ts";
import {
  CACHE_TTL_MS,
  COLD_FILES_MAX,
  COLD_PROMPT_CHARS_MAX,
  COLD_PROMPTS_MAX,
} from "./limits.ts";
import { COLD } from "./prompts.ts";

/** The tools whose `file_path` input is a changed file. */
const WRITERS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);

/**
 * True when the last request of the main thread, at `lastTurnAt` in milliseconds, is older than the cache TTL of 1 hour.
 * With no request seen in this process, the session was resumed and its cache is gone, so the answer is `true`.
 */
export const isCold = (now: number, lastTurnAt: number | null): boolean =>
  lastTurnAt === null || now - lastTurnAt > CACHE_TTL_MS;

const cut = (text: string): string => clip(text, COLD_PROMPT_CHARS_MAX);

/** The paths of the files that the tool calls changed, each once, the newest `COLD_FILES_MAX` in the order of first change. */
const changedFiles = (messages: readonly SessionMessage[]): string[] => {
  const files = new Set<string>();
  for (const use of messages.flatMap((m) => m.toolUses)) {
    const path = (use.input as { file_path?: unknown } | undefined)?.file_path;
    if (WRITERS.has(use.tool) && typeof path === "string") files.add(path);
  }
  return [...files].slice(-COLD_FILES_MAX);
};

/** `texts` as one block quote, with a `>` line between two quoted messages and no blank line inside the block. */
const quote = (texts: readonly string[]): string =>
  texts
    .map((t) =>
      cut(t.trim())
        .split("\n")
        .map((line) => (line === "" ? ">" : `> ${line}`))
        .join("\n"),
    )
    .join("\n>\n");

/**
 * The text of a cold handoff of `messages`.
 * After an earlier compaction the first user message is the wrapper of the earlier handoff:
 * the task comes from the original first message, and the earlier handed text stays whole.
 */
export const coldHandoff = (messages: readonly SessionMessage[]): string => {
  const prompts = messages
    .filter((m) => m.role === "user" && m.text.trim() !== "")
    .map((m) => m.text);
  const head = prompts[0] ?? "";
  const earlier = earlierHanded(head);
  const files = changedFiles(messages).map((f) => `\`${f}\``);
  return COLD({
    task: cut(originalFirst(head).trim().split("\n")[0] ?? ""),
    files: files.length === 0 ? "none" : files.join(", "),
    words: quote(
      (earlier === "" ? prompts : prompts.slice(1)).slice(-COLD_PROMPTS_MAX),
    ),
    earlier: earlier === "" ? "none" : earlier,
  });
};
