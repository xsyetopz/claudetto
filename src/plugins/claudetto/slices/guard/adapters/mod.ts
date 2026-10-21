// The mod handler of the `guard` slice:
// `tool.call` on `Bash` denies a command that only prints a file and names the `Read` call (design D22).
// `tool.check` on `Bash` asks the person before a `git push` with a delete refspec such as `origin :branch`, because an ask rule cannot match it (task 4.1 of `post-0-2-0`),
// and before a `docker` command that runs or creates a container, also with options before the verb (task 3.3 of `post-0-2-0`).
// The ask has `decider: "person"`, so in each mode the dialog is the only approver, and no allow rule, classifier, or `bypassPermissions` settles it.
// Where no person can be asked, the call is refused (Claude Code 2.1.304).
//
// The hook has no catch-all.
// A `catch` here names the error that it expects, and the others reach the log of Claude Code.
// When the hook throws or times out, Claude Code skips it, so the call would run (a guard fails open, d.ts of 2.1.303 to 2.1.305).
// So the slice gives `onBashFail` to `.catch()`, which denies a command that prints a file (fail closed).
//
// `claude plugin validate` follows `$` only into a function of one file,
// so each function that touches `$` is here, and the rules are in `domain/`.

import type { CatchHandler, EngineInterface, MatchedHook } from "claude-code";
import { lineCount } from "../../../../../kernel/text.ts";
import { type Count, printReason } from "../domain/deny.ts";
import { dockerRun } from "../domain/docker.ts";
import { printsOf } from "../domain/reads.ts";
import { deleteRefspec } from "../domain/refspec.ts";
import { READ_MAX_BYTES } from "../limits.ts";
import { CHECK_FAIL, DOCKER_ASK, FAIL_DENY, REFSPEC_ASK } from "../prompts.ts";

/** The line count of a file for the print rule: `Infinity` when it is too large to read. */
const countOf =
  ($: EngineInterface): Count =>
  async (file) => {
    if (!(await $.fs.exists(file))) return null;
    const stat = await $.fs.stat(file);
    if (stat.kind !== "file") return null;
    if (stat.size > READ_MAX_BYTES) return Infinity;
    return lineCount(await $.fs.read(file));
  };

// A `Bash` command is denied as a print only when each part of it prints a file, and the `Read` call of the same range runs instead.
// A compound command with a part that does other work runs.
// The `sembr` rewrite of the phase `rewrite` runs before this deny of the phase `check`, so the deny checks the command that would run.
// The session folder is read only for a command that prints a file, because a relative path needs it.
/** The `tool.call` hook with the `Bash` filter. */
type BashHook = MatchedHook<"tool.call", { readonly tool: readonly ["Bash"] }>;

export const onBashCall: BashHook = async ($, e, next) => {
  if (!printsOf(e.command, "").length) return next(e);
  const cwd = await $.session.cwd();
  const deny = await printReason(e.command, cwd, countOf($));
  return deny ? { deny } : next(e);
};

/** The error handler of the hook: a command that prints a file is denied, and any other command runs. */
export const onBashFail: CatchHandler<BashHook> = (_$, e, next) => {
  if (next.called || !printsOf(e.command, "").length) return next(e);
  return {
    deny: FAIL_DENY({ kind: next.error.kind }),
  };
};

/** The `tool.check` hook with the `Bash` filter. */
type BashCheck = MatchedHook<
  "tool.check",
  { readonly tool: readonly ["Bash"] }
>;

/** The verdict of the engine, and an ask of the person when the command pushes a delete refspec or runs a container. A deny of the engine stays. */
export const onBashCheck: BashCheck = async (_$, e, next) => {
  const v = await next(e);
  if (v.decision === "deny") return v;
  const command = (e.input as { command?: unknown } | null)?.command;
  const ref = deleteRefspec(command);
  if (ref !== null)
    return { decision: "ask", decider: "person", reason: REFSPEC_ASK({ ref }) };
  const verb = dockerRun(command);
  return verb === null
    ? v
    : { decision: "ask", decider: "person", reason: DOCKER_ASK({ verb }) };
};

/** The error handler of the check: a check that throws denies, because nothing has run. */
export const onBashCheckFail: CatchHandler<BashCheck> = () => ({
  decision: "deny",
  reason: CHECK_FAIL,
});
