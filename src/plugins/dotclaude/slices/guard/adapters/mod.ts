// The mod handlers of the `guard` slice:
// `tool.call` on `Bash` denies a command that only prints a file and names the `Read` call (design D22),
// and denies a subagent's command that changes the state of the shared checkout (`git stash`, `git reset --hard`, and others),
// and `tool.check` asks before the first call of a session that reaches a GitHub repository of another owner with an AI policy.
//
// The guard only asks, and it keeps a deny of the engine, so it never weakens a rule of the user.
// The hook has no catch-all on purpose.
// When it throws after `next` resolved, Claude Code logs the failure and the verdict of the engine stands.
// When it throws before `next`, Claude Code skips the hook and the call runs.
// A `catch` here names the error that it expects, and the others reach that log.
//
// `claude plugin validate` follows `$` only into a function of one file,
// so each function that touches `$` is here, and the rules are in `domain/`.

import type { EngineInterface } from "claude-code";
import { POLICY_TIMEOUT_MS } from "../../../../../kernel/budget.ts";
import type { Handler } from "../../../../../kernel/slice.ts";
import { lineCount } from "../../../../../kernel/text.ts";
import { type Count, printReason } from "../domain/deny.ts";
import { sharedGitReason } from "../domain/git.ts";
import { askReason, LOGIN_ARGV, linesOf, ORGS_ARGV } from "../domain/owners.ts";
import { printsOf } from "../domain/reads.ts";
import { READ_MAX_BYTES } from "../limits.ts";

/**
 * The stdout of `argv`, or null when it exits with a code other than 0.
 * A run that throws is not caught: Claude Code logs it and the verdict of the engine stands.
 */
const output = async ($: EngineInterface, argv: readonly string[]) => {
  const r = await $.process.run(argv, { timeoutMs: POLICY_TIMEOUT_MS });
  return r.exitCode === 0 ? r.stdout : null;
};

// The logins of the user and the organizations where the user is an admin.
// Only a complete answer is kept, so a failed `gh` call is tried again at the next check.
let owners: string[] | undefined;
const ownersOf = async ($: EngineInterface) => {
  if (owners) return owners;
  const login = await output($, LOGIN_ARGV);
  const orgs = login === null ? null : await output($, ORGS_ARGV);
  const found = [...linesOf(login), ...linesOf(orgs)];
  if (login !== null && orgs !== null && linesOf(login).length) owners = found;
  return found;
};

// The repositories that this process checked, for each session.
const checked = new Map<string, Set<string>>();

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

// A `Bash` command of a subagent that changes the state of the shared checkout is denied, such as `git stash` (spec P35, step 4).
// The main session keeps its asks, so this deny reads only the `agentId` of the call.
// A `Bash` command that prints a file, also in one part of a compound command, is denied here, and the `Read` call of the same range runs instead.
// The `sembr` rewrite of the phase `rewrite` runs before this deny of the phase `check`, so the deny checks the command that would run.
// The session folder is read only for a command that prints a file, because a relative path needs it.
export const onBashCall: Handler<"tool.call"> = async ($, e, next) => {
  if (e.tool !== "Bash") return next(e);
  const shared = e.agentId ? sharedGitReason(e.command) : null;
  if (shared) return { deny: shared };
  if (!printsOf(e.command, "").length) return next(e);
  const cwd = await $.session.cwd();
  const deny = await printReason(e.command, cwd, countOf($));
  return deny ? { deny } : next(e);
};

// The ask reason of `guard` comes first, then the ask reason of `next`, so the ask of another slice stays.
export const onCheck: Handler<"tool.check"> = async ($, e, next) => {
  const verdict = await next(e);
  if (verdict?.decision === "deny") return verdict;
  const session = await $.session.id();
  let seen = checked.get(session);
  if (!seen) {
    seen = new Set();
    checked.set(session, seen);
  }
  const own = await askReason(e.tool, e.input, {
    seen,
    run: (argv) => output($, argv),
    owners: () => ownersOf($),
  });
  if (!own) return verdict;
  const reason =
    verdict?.decision === "ask" && verdict.reason
      ? `${own}\n\n${verdict.reason}`
      : own;
  return { decision: "ask", reason };
};
