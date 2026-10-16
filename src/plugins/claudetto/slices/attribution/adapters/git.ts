// The `tool.call` handlers of the `attribution` slice for git and pull requests, when Claude Code runs them and not the user.
// `onBash` denies a `git commit` that skips or changes the `commit-msg` hook of `kernel/commit-hook`, and after a `gh pr create` or `gh pr edit` it checks the pull request body.
// `onPullRequestTool` checks the `body` of a GitHub MCP tool before the call, which needs no network.
// Both stay silent when the line is off, and the checks after the call fail open: a missing `gh`, no network, or a body that is not readable adds nothing.

import type { EngineInterface, MatchedHook } from "claude-code";
import type { Handler } from "../../../../../kernel/slice.ts";
import { bypassOf, type PrCall, prCallsOf } from "../domain/git-call.ts";
import { linesOf } from "../domain/lines.ts";
import { bodyOf, endsWithLine, missingNote, urlOf } from "../domain/pr.ts";
import { BYPASS_DENY, PR_DENY } from "../prompts.ts";

/** The hook for `Bash`, with `e` narrowed to it by the filter of `slice.ts`. */
export type BashHook = MatchedHook<
  "tool.call",
  { readonly tool: readonly ["Bash"] }
>;

/** The lines of the merged settings, or `undefined` when the engine cannot give them, so the call passes. */
const linesNow = async ($: EngineInterface) => {
  try {
    return linesOf(await $.settings.read(), undefined);
  } catch {
    return undefined;
  }
};

/** The body of the pull request that `call` names, or `undefined` when `gh` cannot give it. */
const bodyNow = async (
  $: EngineInterface,
  call: PrCall,
  output: string,
): Promise<string | undefined> => {
  const target = call.verb === "edit" ? call.target : urlOf(output);
  const argv = ["gh", "pr", "view", ...(target ? [target] : [])];
  if (call.repo) argv.push("--repo", call.repo);
  try {
    const run = await $.process.run([...argv, "--json", "body"]);
    return run.exitCode === 0 ? bodyOf(run.stdout) : undefined;
  } catch {
    return undefined;
  }
};

export const onBash: BashHook = async ($, e, next) => {
  const lines = await linesNow($);
  if (lines === undefined) return next(e);
  const bypass = lines.commit ? bypassOf(e.command) : undefined;
  if (bypass) return { deny: BYPASS_DENY({ what: `\`${bypass}\`` }) };
  const out = await next(e);
  if (out.deny !== undefined) return out;
  const calls = lines.pr && !out.isError ? prCallsOf(e.command) : [];
  const notes: string[] = [];
  for (const call of calls) {
    const body = await bodyNow($, call, out.text ?? "");
    const note = body === undefined ? undefined : missingNote(body, lines.pr);
    if (note) notes.push(note);
  }
  if (notes.length === 0) return out;
  return { ...out, context: [...(out.context ?? []), ...notes] };
};

export const onPullRequestTool: Handler<"tool.call"> = async ($, e, next) => {
  const body: unknown = Reflect.get(e, "body");
  if (typeof body !== "string") return next(e);
  const lines = await linesNow($);
  if (lines?.pr && !endsWithLine(body, lines.pr))
    return { deny: PR_DENY({ line: lines.pr }) };
  return next(e);
};
