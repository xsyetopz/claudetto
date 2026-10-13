// The mod handler of the `attribution` slice: the `tool.call` rewrite of a `git commit` and a `gh pr create` on `Bash` (design D39).
// The model comes from `$.session.model()` for the main loop, and a subagent call names `Claude`,
// because the transcript of a subagent is not read (evidence `attribution.md`).
// A command with no commit and no pull request reads no port, so it passes on at once.
// The rules are in `domain/`, which imports no port.

import type { MatchedHook } from "claude-code";
import { attributeCommand, needsAttribution } from "../domain/call.ts";
import { linesOf } from "../domain/lines.ts";

/** The hook for `Bash`, with `e` narrowed to it. */
export type AttributionHook = MatchedHook<
  "tool.call",
  { readonly tool: readonly ["Bash"] }
>;

export const onToolCall: AttributionHook = async ($, e, next) => {
  if (!needsAttribution(e.command)) return next(e);
  const model = e.agentId === undefined ? await $.session.model() : undefined;
  const lines = linesOf(await $.settings.read(), model);
  const command = attributeCommand(e.command, lines);
  return next(command === undefined ? e : { ...e, command });
};
