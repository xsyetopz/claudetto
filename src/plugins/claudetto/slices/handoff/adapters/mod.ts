// The mod handler of the `handoff` slice: the `session.compact` hook of the main thread (design D3, spec `handoff`).
// A fork writes the handoff, the hook writes it to a file and checks it with `$.fs.stat`,
// and the hook gives back the first user message, the handoff message, and the tail in place of the summary.
// When the new context is not below the trigger of the session model, there is nothing to fork (such as after a resume),
// the model gives no handoff, `$.session.model` fails, or the file is missing or empty, `next(e)` runs the built-in compaction.
// A subagent compaction passes on with no change, and the filter has the trigger `plugin` of `$.session.compact` too.
// On a terminal, a status line shows while the handoff is written, and a notice names the file. In `-p` the hooks draw nothing.
// With the `compaction` option `built-in`, each compaction goes to Claude Code unchanged and `/handoff` is not registered.
//
// `/handoff` is the manual handoff (design D3): on a terminal, a fork writes the handoff, and the hook writes and checks the file.
// In `-p`, or when the fork gives no handoff or the write fails, the step is the compaction path.
// Claude Code refuses `$.command.run`, `$.prompt.submit`, and `$.session.compact` in a `command.run` hook,
// and `turn.complete` does not fire after a command that a hook answers (`handoff-p-301.md`),
// so a `$.clock.after` timer runs the step after the hook: it clears the chat and submits the handed message, or it runs `/compact`.
// The ground check warns about each value in backticks that is not in the messages (`domain/ground.ts`).
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
import { CHANGES_DIR } from "../../../../../kernel/paths.ts";
import type { Handler } from "../../../../../kernel/slice.ts";
import { oneLine } from "../../../../../kernel/text.ts";
import {
  compactedMessages,
  forkPrompt,
  handedText,
  handoffPath,
  isHandoff,
  triggerTokens,
  withChange,
} from "../domain/compact.ts";
import { missingValues, missLine } from "../domain/ground.ts";
import { COMMAND_HANDOFF, RULES, WRITTEN_NOTICE } from "../prompts.ts";

/** The hook for the triggers in the filter of `slice.ts`, with `e` narrowed to them. */
export type CompactHook = MatchedHook<
  "session.compact",
  { readonly trigger: readonly ["auto", "manual", "plugin"] }
>;

/** The name of the manual handoff command, without the slash. */
export const HANDOFF_COMMAND = "handoff";

/** The status line on a terminal while the handoff is written, in place of the spinner of the compaction. */
const PROGRESS_TEXT = "Writing the handoff…";

/** The `userConfig` values of the plugin, which the generated `register` gives to `keepOptions`. */
const kept: { options: PluginOptions } = { options: {} };

/** Keeps the `userConfig` values of the plugin for the hooks of the slice. */
export const keepOptions = (options: PluginOptions): void => {
  kept.options = options;
};

/** True when the `compaction` option turns the handoff off. */
const isOff = () => isBuiltInCompaction(kept.options);

/** The text of the handoff from a fork, or `null` for no reply, nothing to fork, an error, or a text that is not a handoff. */
const handoffText = async (
  $: EngineInterface,
  prompt: string,
): Promise<string | null> => {
  // A call of the model can throw, such as with an SDK error, and then the built-in compaction runs.
  const fork = await $.model.fork({ prompt }).catch(() => null);
  return fork?.isAnswered && isHandoff(fork.text) ? fork.text : null;
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

/** The values in backticks of `reply` that are not in `messages`, each with one debug log line (`domain/ground.ts`). */
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
const fileOf = async ($: EngineInterface, reply: string) => {
  const root = await rootOf($);
  const change = await openChangeOf($, root);
  return {
    path: `${root}${handoffPath(new Date(), change)}`,
    text: withChange(`${reply.trimEnd()}\n`, change),
  };
};

/** True when the write of `text` to `path` succeeds and the file is not empty after it. */
const isWritten = ($: EngineInterface, path: string, text: string) =>
  $.fs
    .write(path, text)
    .then(() => $.fs.stat(path))
    .then(
      (stat) => stat.size > 0,
      () => false,
    );

/** The new messages and the path of the written handoff file, or `null` when the built-in compaction runs. */
const compacted = async (
  $: EngineInterface,
  messages: readonly SessionMessage[],
): Promise<{ messages: SessionMessage[]; path: string } | null> => {
  const reply = await handoffText($, forkPrompt(messages));
  const model = await $.session.model().catch(() => null);
  if (reply === null || model === null) return null;
  const { path, text } = await fileOf($, reply);
  const kept = compactedMessages(
    messages,
    handedText(path, text, ungrounded($, reply, messages)),
    triggerTokens(model),
  );
  // The file is written only for a new context that is below the trigger.
  // The spec gives the compaction back to Claude Code on each failure of the write.
  return kept !== null && (await isWritten($, path, text))
    ? { messages: kept, path }
    : null;
};

export const onCompact: CompactHook = async ($, e, next) => {
  if (e.agentId !== undefined || isOff()) return next(e);
  const isShown = await isTerminal($);
  if (isShown) $.ui.status(PROGRESS_TEXT);
  const done = await compacted($, e.messages).finally(() => {
    if (isShown) $.ui.status(undefined);
  });
  if (done === null) return next(e);
  if (isShown) $.ui.log(oneLine(WRITTEN_NOTICE({ path: done.path })));
  return { messages: done.messages };
};

/**
 * Registers `/handoff` for the session.
 * Claude Code refuses the name when another plugin has it, and then `/compact` stays.
 */
const register = ($: EngineInterface) =>
  $.command
    .register({ name: HANDOFF_COMMAND, description: COMMAND_HANDOFF })
    .catch(() => undefined);

/** `session.start`: registers `/handoff` for the session. */
export const onStart: Handler<"session.start"> = async ($, e, next) => {
  const started = await next(e);
  if (!isOff()) await register($);
  return started;
};

/** A written handoff file on a terminal: its path and the message that hands it over. */
type Handed = { path: string; text: string };

/** A new handoff file on a terminal, or `null` for the compaction path. */
const handedFile = async ($: EngineInterface): Promise<Handed | null> => {
  // The command runs after the turn, so the fork sees each tool result and there is no tail.
  const reply = await handoffText($, RULES);
  if (reply === null) return null;
  const { path, text } = await fileOf($, reply);
  if (!(await isWritten($, path, text))) return null;
  // When the messages fail to read, the check has nothing to look in, so it gives no warning.
  const messages = await $.session.messages().catch(() => null);
  const missing = messages === null ? [] : ungrounded($, reply, messages);
  return { path, text: handedText(path, text, missing) };
};

/** Clears the chat and submits the message that hands over the file. */
const handOff = async ($: EngineInterface, handed: Handed) => {
  await $.command.run({ command: "clear" });
  // A clear starts a new session, and `session.start` does not fire for it, so the command is registered again.
  await register($);
  // The notice comes after the clear, which removes the transcript.
  $.ui.log(oneLine(WRITTEN_NOTICE({ path: handed.path })));
  await $.prompt.submit({ text: handed.text });
};

/** `command.run` of `/handoff`: on a terminal it writes the handoff, and a timer runs the step after the hook, the handed file or `/compact`. */
export const onCommand: Handler<"command.run"> = async ($) => {
  let handed: Handed | null = null;
  if (await isTerminal($)) {
    $.ui.status(PROGRESS_TEXT);
    handed = await handedFile($).finally(() => $.ui.status(undefined));
  }
  const step = () =>
    handed === null
      ? $.command.run({ command: "compact" })
      : handOff($, handed);
  $.clock.after(0, () => void step().catch(() => undefined));
  return {};
};
