// The mod handler of the `handoff` slice: the `session.compact` hook of the main thread (design D3, spec `handoff`).
// A fork writes the handoff, the hook writes it to a file and checks it with `$.fs.stat`,
// and the hook gives back the first user message, the handoff message, and the tail in place of the summary.
// `next(e)` runs the built-in compaction when: the new context is not below the trigger of the session model,
// there is nothing to fork (such as after a resume), the model gives no handoff, `$.session.model` fails, or the file is missing or empty.
// A subagent compaction passes on with no change, and the filter has the trigger `plugin` of `$.session.compact` too.
// On a terminal, a status line shows while the handoff is written, and a notice names the file. In `-p` the hooks draw nothing.
// With the `compaction` option `built-in`, each compaction goes to Claude Code unchanged.
// The ground check warns about each value in backticks that is not in the messages (`kernel/ground.ts`).
// Each path starts at the project root, because `$.fs` resolves a relative path against the folder of the shell (D23).
// `claude plugin validate` follows `$` only into a function of one file, so each function that touches `$` is here, and the rules are in `domain/`.

import type {
  EngineInterface,
  MatchedHook,
  PluginOptions,
  SessionMessage,
} from "claude-code";
import { openChange } from "../../../../../kernel/change.ts";
import { isBuiltInCompaction } from "../../../../../kernel/compaction.ts";
import { missingValues, missLine } from "../../../../../kernel/ground.ts";
import { CHANGES_DIR } from "../../../../../kernel/paths.ts";
import type { Handler } from "../../../../../kernel/slice.ts";
import { oneLine } from "../../../../../kernel/text.ts";
import { passedChecks } from "../checks.ts";
import { coldHandoff, isCold } from "../cold.ts";
import {
  compactedMessages,
  forkPrompt,
  handedText,
  handoffPath,
  isHandoff,
  joinQuotes,
  statusFree,
  triggerTokens,
  withChange,
} from "../compact.ts";
import { WRITTEN_NOTICE } from "../prompts.ts";

/** The hook for the triggers in the filter of `slice.ts`, with `e` narrowed to them. */
export type CompactHook = MatchedHook<
  "session.compact",
  { readonly trigger: readonly ["auto", "manual", "plugin"] }
>;

/** The `userConfig` values of the plugin, which the generated `register` gives to `keepOptions`. */
const kept: { options: PluginOptions } = { options: {} };

/** Keeps the `userConfig` values of the plugin for the hooks of the slice. */
export const keepOptions = (options: PluginOptions): void => {
  kept.options = options;
};

/** The time of the end of the last turn of the main thread in milliseconds, or `null` before the first turn of this process. */
let lastTurnAt: number | null = null;

/** Notes that the main thread, with no `agentId`, wrote or read the prompt cache just now (D47). */
const noteCache = async ($: EngineInterface, agentId: string | undefined) => {
  if (agentId === undefined)
    lastTurnAt = await $.clock.now().catch(() => lastTurnAt);
};

/** `turn.complete`: notes the end of a turn of the main thread. */
export const onTurnComplete: Handler<"turn.complete"> = async ($, e, next) => {
  await noteCache($, e.agentId);
  return next(e);
};

/** `turn.step`: notes each model request of the main thread, so a long turn keeps the cache warm for the auto compaction inside it. */
export const onTurnStep: Handler<"turn.step"> = async function* ($, e, next) {
  await noteCache($, e.agentId);
  return yield* next(e);
};

/** The text of the handoff from a fork, or `null` for no reply, nothing to fork, an error, or a text that is not a handoff. */
const handoffText = async (
  $: EngineInterface,
  prompt: string,
): Promise<string | null> => {
  const fork = await $.model.fork({ prompt }).catch(() => null);
  return fork?.isAnswered && isHandoff(fork.text)
    ? statusFree(fork.text)
    : null;
};

/** True when the session has a terminal, where the handoff shows its progress. */
const isTerminal = ($: EngineInterface) =>
  $.session.surfaces().then(
    (surfaces) => surfaces.includes("terminal"),
    () => false,
  );

/** The project root with a final `/`: `CLAUDE_PROJECT_DIR`, or the root of the session, or `""` with no root (D23). */
const rootOf = async ($: EngineInterface): Promise<string> => {
  const root =
    (await $.env.get("CLAUDE_PROJECT_DIR").catch(() => undefined)) ||
    (await $.session.root().catch(() => ""));
  return root === "" ? "" : `${root.replace(/\/+$/, "")}/`;
};

/** The open change among the folders of `openspec/changes/`, or `null` when no change has an open task. The `archive` folder is no change. */
const openChangeOf = async ($: EngineInterface, root: string) => {
  const entries = await $.fs.list(`${root}${CHANGES_DIR}`).catch(() => []);
  const changes = await Promise.all(
    entries
      .filter((e) => e.kind === "dir" && e.name !== "archive")
      .map(async ({ name }) => ({
        name,
        tasks: await $.fs
          .read(`${root}${CHANGES_DIR}/${name}/tasks.md`)
          .then((t) => (typeof t === "string" ? t : null))
          .catch(() => null),
      })),
  );
  return openChange(changes);
};

/** The values in backticks of `reply` that are not in `messages`, each with one debug log line (`kernel/ground.ts`). */
const ungrounded = (
  $: EngineInterface,
  reply: string,
  messages: readonly SessionMessage[],
): string[] => {
  const missing = missingValues(reply, messages);
  for (const value of missing) $.ui.log(missLine(value), { to: "debug" });
  return missing;
};

/** The path of a new handoff file and the text of the file for `reply`, with the open change at its start. */
const fileOf = async (
  $: EngineInterface,
  reply: string,
  messages: readonly SessionMessage[],
) => {
  const root = await rootOf($);
  const change = await openChangeOf($, root);
  return {
    path: `${root}${handoffPath(new Date(), change)}`,
    text: withChange(
      `${joinQuotes(reply.trimEnd())}\n`,
      change,
      passedChecks(messages),
    ),
  };
};

/** The size in bytes of the file after the write of `text` to `path`, or `0` when the write fails. */
const writtenSize = ($: EngineInterface, path: string, text: string) =>
  $.fs
    .write(path, text)
    .then(() => $.fs.stat(path))
    .then(
      (stat) => stat.size,
      () => 0,
    );

/** The new messages and the path of the written handoff file, or `null` when the built-in compaction runs. */
const compacted = async (
  $: EngineInterface,
  messages: readonly SessionMessage[],
  isCache: "cold" | "warm",
): Promise<{
  messages: SessionMessage[];
  path: string;
  size: number;
} | null> => {
  // A cold cache makes a fork read the full history as uncached input, so the handoff holds only what needs no model (D47).
  const reply =
    isCache === "cold"
      ? coldHandoff(messages)
      : await handoffText($, forkPrompt(messages));
  if (reply === null) return null;
  const model = await $.session.model().catch(() => null);
  if (model === null) return null;
  const { path, text } = await fileOf($, reply, messages);
  const kept = compactedMessages(
    messages,
    handedText(path, text, ungrounded($, reply, messages)),
    triggerTokens(model),
  );
  // The file is written only for a new context that is below the trigger.
  // The spec gives the compaction back to Claude Code on each failure of the write.
  if (kept === null) return null;
  const size = await writtenSize($, path, text);
  return size > 0 ? { messages: kept, path, size } : null;
};

export const onCompact: CompactHook = async ($, e, next) => {
  if (e.agentId !== undefined || isBuiltInCompaction(kept.options))
    return next(e);
  const now = await $.clock.now().catch(() => null);
  const cache = now !== null && isCold(now, lastTurnAt) ? "cold" : "warm";
  const isShown = await isTerminal($);
  if (isShown) $.ui.status("Writing the handoff…");
  const done = await compacted($, e.messages, cache).finally(() => {
    if (isShown) $.ui.status(undefined);
  });
  if (done === null) return next(e);
  if (isShown)
    $.ui.log(
      oneLine(
        WRITTEN_NOTICE({
          path: done.path,
          size: String(done.size),
          mode: cache === "cold" ? "cold write" : "warm fork",
        }),
      ),
    );
  return { messages: done.messages };
};
