// The mod handlers of the `prompt` slice:
// `prompt.context` adds the `context_management` block with the text of the compaction state,
// because the body of `claudetto:main` replaces the built-in sections, and that text changes with the session.
// It also adds the `shell` block with the shell facts of the platform and the shell, when one applies.
// `tool.describe` gives each kept tool the shorter claudetto text, and defers the tools of `DEFERRED_TOOLS`.
// `prompt.attachment` turns the `off` attachments of the verdicts off.

import type { EngineInterface, PluginOptions } from "claude-code";
import type { Handler } from "../../../kernel/slice.ts";
import {
  CONTEXT_BLOCK,
  CONTEXT_TEXT,
  compactionState,
} from "../domain/compaction.ts";
import { SHELL_BLOCK, shellFacts } from "../domain/environment.ts";
import { DEFERRED_TOOLS, TOOL_TEXTS } from "../domain/tools.ts";

/** The `userConfig` values of the plugin, which the generated `register` gives to `keepOptions`. */
const kept: { options: PluginOptions } = { options: {} };

export const keepOptions = (options: PluginOptions): void => {
  kept.options = options;
};

/** The shell facts of this process: `uname -s` runs one time, and a failed run gives no platform. */
let facts: Promise<string> | undefined;
const shellFactsOf = async ($: EngineInterface): Promise<string> => {
  facts ??= Promise.all([
    $.process.run(["uname", "-s"]).then(
      (run) => (run.exitCode === 0 ? run.stdout : ""),
      () => "",
    ),
    $.env.get("SHELL").then(
      (shell) => shell ?? "",
      () => "",
    ),
  ]).then(([platform, shell]) => shellFacts(platform, shell));
  return facts;
};

// A block of the same name from below is replaced, so each block is there one time.
export const onContext: Handler<"prompt.context"> = async ($, e, next) => {
  const { blocks, ...rest } = await next(e);
  const state = compactionState(
    kept.options,
    await $.env.get("DISABLE_COMPACT"),
  );
  const shell = await shellFactsOf($);
  return {
    ...rest,
    blocks: [
      ...blocks.filter(
        (b) => b.name !== CONTEXT_BLOCK && b.name !== SHELL_BLOCK,
      ),
      { name: CONTEXT_BLOCK, text: CONTEXT_TEXT[state] },
      ...(shell ? [{ name: SHELL_BLOCK, text: shell }] : []),
    ],
  };
};

// A tool text is ours when it is shorter than the engine text, so a shorter text of a new build stays.
// The `agents` slice and the `Agent(...)` deny rules of the settings drop the built-in agents.
export const onToolDescribe: Handler<"tool.describe"> = async (_$, e, next) => {
  const answer = await next(e);
  if (DEFERRED_TOOLS.includes(e.tool)) return { ...answer, isDeferred: true };
  const text = TOOL_TEXTS[e.tool];
  return text !== undefined && text.length < answer.description.length
    ? { ...answer, description: text }
    : answer;
};

// The `off` verdicts of the attachments: the list is in `domain/off.ts`, and the `filter` in `slice.ts` narrows the event to it.

/** An attachment of an `off` kind is left out of the request. */
// It takes no parameter, because the filter narrows the event to kinds that carry no `detail`, and `Handler` types the wider union.
export const onAttachment = (): { text: null } => ({ text: null });
