// The mod handler of the `handoff` slice: the `session.compact` hook of the main thread (design D3, spec `handoff`).
// A fork writes the handoff, the hook writes it to a file and checks it with `$.fs.stat`,
// and the hook gives back the first user message, the handoff message, and the tail in place of the summary.
// With nothing to fork, such as after a resume, `$.model.complete` writes it from a digest of at most `DIGEST_TOKENS_MAX` tokens,
// because a completion reads no prompt cache (`handoff-cost-301.md`, `domain/digest.ts`).
// When the new context is not below the trigger of the session model, the hook cuts the tail.
// When the digest does not fit, the model gives no handoff, the cut is not enough, `$.session.model` fails,
// or the file is missing or empty, `next(e)` runs the built-in compaction.
// A subagent compaction passes on with no change, and the filter has the trigger `plugin` of `$.session.compact` too.
// On a terminal, a status line shows while the handoff is written, and a notice names the file. In `-p` the hooks draw nothing.
// With the `compaction` option `built-in`, each compaction goes to Claude Code unchanged, the cheapest path,
// because the summary request reads the prompt cache and new messages would not (`handoff-cost-301.md`), and `/handoff` is not registered.
// On a managed machine where the guard skips `claudetto` for `session.compact`, `session.start` shows one notice with the managed entries
// that turn it on (`domain/managed.ts`). The plan comes from `oauthAccount` in the state file of Claude Code,
// because `$.session.identity()` answers only to a plugin that the managed settings install.
//
// `/handoff` is the manual handoff (design D3): on a terminal, a fork writes the handoff, and the hook writes and checks the file.
// In `-p`, or when the fork gives no handoff or the write fails, the step is the compaction path.
// Claude Code refuses `$.command.run`, `$.prompt.submit`, and `$.session.compact` in a `command.run` hook,
// and `turn.complete` does not fire after a command that a hook answers (`handoff-p-301.md`),
// so a `$.clock.after` timer runs the step after the hook: it clears the chat and submits the handed message, or it runs `/compact`.
// The ground check warns about each value in backticks that is not in the messages (`domain/ground.ts`),
// and the file keeps the last user messages and the changed files with no model call (`domain/kept.ts`).
// Each path starts at the project root, because `$.fs` resolves a relative path against the folder of the shell (D23).
// `/handoff-setup` has its handlers in `setup.ts`.
// `claude plugin validate` follows `$` only into a function of one file, so each function that touches `$` is here, and the rules are in `domain/`.

import type {
  EngineInterface,
  MatchedHook,
  PluginOptions,
  SessionMessage,
} from "claude-code";
import { openChange } from "../../../../../kernel/change.ts";
import { isBuiltInCompaction } from "../../../../../kernel/compaction.ts";
import { CHANGES_DIR, CLAUDE_STATE_FILE } from "../../../../../kernel/paths.ts";
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
import { digestPrompt } from "../domain/digest.ts";
import { missingValues, missLine } from "../domain/ground.ts";
import { withKept } from "../domain/kept.ts";
import { isAppended, isGuardSeated, managedNotice } from "../domain/managed.ts";
import {
  handoffMarkdown,
  PROGRESS_TEXT,
  writtenNotice,
} from "../domain/markdown.ts";
import { HANDOFF_MODEL } from "../limits.ts";
import { COMMAND_HANDOFF, COMMAND_SETUP, RULES } from "../prompts.ts";

// The generator takes each handler of the slice from this file.
export { onPluginRegister, onSetup } from "./setup.ts";

/** The hook for the triggers in the filter of `slice.ts`, with `e` narrowed to them. */
export type CompactHook = MatchedHook<
  "session.compact",
  { readonly trigger: readonly ["auto", "manual", "plugin"] }
>;

/** The name of the manual handoff command, without the slash. */
export const HANDOFF_COMMAND = "handoff";

/** The name of the command of the managed setup help, without the slash. */
export const SETUP_COMMAND = "handoff-setup";

/** The `userConfig` values of the plugin, which the generated `register` gives to `keepOptions`. */
const kept: { options: PluginOptions } = { options: {} };

/** Keeps the `userConfig` values of the plugin for the hooks of the slice. */
export const keepOptions = (options: PluginOptions): void => {
  kept.options = options;
};

/** True when the `compaction` option turns the handoff off. */
const isOff = () => isBuiltInCompaction(kept.options);

/**
 * The text of the handoff from a fork, or from a completion on the digest of `messages` when there is nothing to fork.
 * `null` when the digest does not fit, or for no reply, an empty reply, or a text that is not a handoff.
 */
const handoffText = async (
  $: EngineInterface,
  messages: readonly SessionMessage[],
): Promise<string | null> => {
  // A call of the model can throw, such as with an SDK error, and then the built-in compaction runs.
  try {
    const fork = await $.model.fork({ prompt: forkPrompt(messages) });
    if (!fork.isAnswered && fork.reason === "nothing-to-fork") {
      const prompt = digestPrompt(messages);
      if (prompt === null) return null;
      const reply = await $.model.complete({ model: HANDOFF_MODEL, prompt });
      return reply.isAnswered && isHandoff(reply.text) ? reply.text : null;
    }
    return fork.isAnswered && isHandoff(fork.text) ? fork.text : null;
  } catch {
    return null;
  }
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

/** The values in backticks of `text` that are not in `messages`, each with one debug log line (`domain/ground.ts`). */
const ungrounded = (
  $: EngineInterface,
  text: string,
  messages: readonly SessionMessage[],
): string[] => {
  const missing = missingValues(text, messages);
  for (const value of missing) $.ui.log(missLine(value), { to: "debug" });
  return missing;
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

/** The MiniSpec change in progress, or `null` when no change has an open task or the folder is missing. The `archive` folder is no change. */
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

/** The new messages and the path of the written handoff file, or `null` when the built-in compaction runs. */
const compacted = async (
  $: EngineInterface,
  messages: readonly SessionMessage[],
): Promise<{ messages: SessionMessage[]; path: string } | null> => {
  const reply = await handoffText($, messages);
  if (reply === null) return null;
  const model = await $.session.model().catch(() => null);
  if (model === null) return null;
  const root = await rootOf($);
  const change = await openChangeOf($, root);
  const path = `${root}${handoffPath(new Date(), change)}`;
  const written = handoffMarkdown(reply);
  const text = withKept(withChange(written, change), messages);
  const kept = compactedMessages(
    messages,
    handedText(path, text, ungrounded($, written, messages)),
    triggerTokens(model),
  );
  // The file is written only for a new context that is below the trigger.
  if (kept === null) return null;
  // The spec gives the compaction back to Claude Code on each failure of the write.
  return (await isWritten($, path, text)) ? { messages: kept, path } : null;
};

export const onCompact: CompactHook = async ($, e, next) => {
  if (e.agentId !== undefined || isOff()) return next(e);
  const isShown = await isTerminal($);
  if (isShown) $.ui.status(PROGRESS_TEXT);
  const done = await compacted($, e.messages).finally(() => {
    if (isShown) $.ui.status(undefined);
  });
  if (done === null) return next(e);
  if (isShown) $.ui.log(oneLine(writtenNotice(done.path)));
  return { messages: done.messages };
};

/**
 * Registers `/handoff` for the session.
 * Claude Code refuses the name when another plugin has it, and then `/compact` stays.
 */
const register = ($: EngineInterface) =>
  Promise.all(
    [
      {
        name: HANDOFF_COMMAND,
        description: COMMAND_HANDOFF,
      },
      {
        name: SETUP_COMMAND,
        description: COMMAND_SETUP,
      },
    ].map((spec) => $.command.register(spec).catch(() => undefined)),
  );

/** The plan of the organization in the state file of Claude Code, or `undefined` when the file or the key is missing. */
const plan = async ($: EngineInterface): Promise<string | undefined> => {
  const dir =
    (await $.env.get("CLAUDE_CONFIG_DIR")) ?? (await $.env.get("HOME"));
  if (dir === undefined) return undefined;
  const state = JSON.parse(await $.fs.read(`${dir}/${CLAUDE_STATE_FILE}`));
  const type = state?.["oauthAccount"]?.["organizationType"];
  return typeof type === "string" ? type : undefined;
};

/** True when the guard skips `claudetto` for `session.compact`. A fact that fails to read counts as absent. */
const isSkipped = async ($: EngineInterface) => {
  const policy = await $.settings
    .read({ source: "policy" })
    .catch(() => undefined);
  if (isAppended(policy, $.plugin.name)) return false;
  return isGuardSeated(policy, await plan($).catch(() => undefined));
};

/**
 * `session.start`: registers `/handoff` for the session, and shows the notice when the guard skips the compaction hook.
 * The guard does not skip `command.run`, so `/handoff` stays.
 */
export const onStart: Handler<"session.start"> = async ($, e, next) => {
  const started = await next(e);
  if (isOff()) return started;
  if (await isSkipped($)) $.ui.log(oneLine(managedNotice($.plugin.name)));
  await register($);
  return started;
};

/** A written handoff file on a terminal: its path and the message that hands it over. */
type Handed = { path: string; text: string };

/** A new handoff file on a terminal, or `null` for the compaction path. */
const handedFile = async ($: EngineInterface): Promise<Handed | null> => {
  // The command runs after the turn, so the fork sees each tool result and there is no tail.
  // A fork that throws gives the compaction path, as a fork with no handoff does.
  const fork = await $.model.fork({ prompt: RULES }).catch(() => null);
  if (!(fork?.isAnswered && isHandoff(fork.text))) return null;
  const root = await rootOf($);
  const change = await openChangeOf($, root);
  const path = `${root}${handoffPath(new Date(), change)}`;
  const written = handoffMarkdown(fork.text);
  // When the messages fail to read, the file keeps no messages, and the check has nothing to look in, so it gives no warning.
  const messages = await $.session.messages().catch(() => null);
  const text = withKept(withChange(written, change), messages ?? []);
  if (!(await isWritten($, path, text))) return null;
  const missing = messages === null ? [] : ungrounded($, written, messages);
  return { path, text: handedText(path, text, missing) };
};

/** Clears the chat and submits the message that hands over the file. */
const handOff = async ($: EngineInterface, handed: Handed) => {
  await $.command.run({ command: "clear" });
  // A clear starts a new session, and `session.start` does not fire for it, so the command is registered again.
  await register($);
  // The notice comes after the clear, which removes the transcript.
  $.ui.log(oneLine(writtenNotice(handed.path)));
  await $.prompt.submit({ text: handed.text });
};

/** The step of `/handoff` after its hook: the handed file, or `/compact` when `handed` is `null`. */
const step = ($: EngineInterface, handed: Handed | null) =>
  (handed === null
    ? $.command.run({ command: "compact" })
    : handOff($, handed)
  ).catch(() => undefined);

/** `command.run` of `/handoff`: writes the handoff on a terminal, and starts a timer for the step after the hook. */
export const onCommand: Handler<"command.run"> = async ($) => {
  if (!(await isTerminal($))) {
    $.clock.after(0, () => void step($, null));
    return {};
  }
  $.ui.status(PROGRESS_TEXT);
  const handed = await handedFile($).finally(() => $.ui.status(undefined));
  $.clock.after(0, () => void step($, handed));
  return {};
};
