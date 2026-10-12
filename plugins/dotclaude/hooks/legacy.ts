// The hand-written hooks of dotclaude that no slice has yet, which the generated `register.ts` calls after the slice handlers.
// The rebuild list `tools/rebuild-pending.txt` names this file, and each package that ports a feature removes its hooks here.
// The hooks: one `tool.check` guard,
// the `tool.call` hooks of the `reads` and `sembr` features:
// a `Bash` command that only prints a file gets a deny that names the `Read` call (design D22),
// `Write` and `Edit` put each sentence of a Markdown file on its own line, `Edit` also splits a cross-sentence `old_string`,
// and `Bash` does the same for the quoted heredoc of `git commit` and `gh pr create`,
// the `tool.check` ask of the `adherence` feature for a change to a test, a config, a hook, or a settings file,
// and the surface hooks (`prompt.attachment`, `agent.offer`, `tool.describe`) that cut attachments, agent lines, and tool schemas by exact id.
// Permission rules and the sandbox of the settings snippet cover the other dangerous calls.
// This guard covers the one case that a rule cannot express:
// the first call of a session that reaches a GitHub repository of another owner with an AI policy.
// A recursive `rm` is an `ask` permission rule of the settings snippet, with the sandbox.
//
// It only asks, and it keeps a deny of the engine, so it never weakens a rule of the user.
// The hook has no catch-all on purpose.
// When it throws after `next` resolved, Claude Code logs the failure and the verdict of the engine stands, so the guard fails open.
// When it throws before `next`, for example on a file read that rejects, Claude Code skips the hook and the call runs (`research/mod-api-probes.md`, item 10).
// A `catch` here names the error that it expects, and the others reach that log.
//
// `claude plugin validate` follows `$` only into a function of this file,
// and each `$.env.get` call needs a literal name.
// For this reason, each function that touches `$` is here, and the rules are in `features/*/rules.ts`.

import type { Args, EngineInterface, On } from "claude-code";
import { FILE_MAX_BYTES } from "../features/adherence/limits.ts";
import { askReason as adherenceReason } from "../features/adherence/rules.ts";
import type { Payload } from "../features/adherence/text.ts";
import {
  askReason,
  LOGIN_ARGV,
  linesOf,
  ORGS_ARGV,
} from "../features/guard/rules.ts";
import { READ_MAX_BYTES } from "../features/reads/limits.ts";
import { type Count, printReason, printsOf } from "../features/reads/rules.ts";
import {
  commandInput,
  editInput,
  writeInput,
} from "../features/sembr/rules.ts";
import {
  ATTACHMENT_TYPES,
  attachmentText,
  isDropped,
  toolAnswer,
} from "../features/surface/rules.ts";
import { POLICY_TIMEOUT_MS } from "../lib/budget.ts";
import { lineCount } from "../lib/text.ts";

/** The tools whose calls the `adherence` checks read. */
const ADHERENCE_TOOLS = new Set(["Bash", "Write", "Edit", "MultiEdit"]);

/**
 * The stdout of `argv`, or null when it exits with a code other than 0.
 * A run that throws is not caught: Claude Code logs it and the verdict of the engine stands.
 */
async function output($: EngineInterface, argv: readonly string[]) {
  const r = await $.process.run(argv, { timeoutMs: POLICY_TIMEOUT_MS });
  return r.exitCode === 0 ? r.stdout : null;
}

// The logins of the user and the organizations where the user is an admin.
// Only a complete answer is kept, so a failed `gh` call is tried again at the next check.
let owners: string[] | undefined;
async function ownersOf($: EngineInterface) {
  if (owners) return owners;
  const login = await output($, LOGIN_ARGV);
  const orgs = login === null ? null : await output($, ORGS_ARGV);
  const found = [...linesOf(login), ...linesOf(orgs)];
  if (login !== null && orgs !== null && linesOf(login).length) owners = found;
  return found;
}

// The repositories that this process checked, for each session.
const checked = new Map<string, Set<string>>();

/** The ask reason of the `guard` rules for the call of `e`, or undefined. */
async function guardAsk($: EngineInterface, e: Args<"tool.check">) {
  const session = await $.session.id();
  let seen = checked.get(session);
  if (!seen) {
    seen = new Set();
    checked.set(session, seen);
  }
  return askReason(e.tool, e.input, {
    seen,
    run: (argv) => output($, argv),
    owners: () => ownersOf($),
  });
}

/**
 * The text of `file` when it is a regular file of at most `max` bytes, else null.
 * An absent file, a folder, and a link give null, so the check reads nothing.
 */
async function fileText($: EngineInterface, file: string, max: number) {
  if (!(await $.fs.exists(file))) return null;
  const stat = await $.fs.stat(file);
  if (stat.kind !== "file" || stat.size > max) return null;
  return $.fs.read(file);
}

/** The line count of a file for the print rule: `Infinity` when it is too large to read. */
function countOf($: EngineInterface): Count {
  return async (file) => {
    if (!(await $.fs.exists(file))) return null;
    const stat = await $.fs.stat(file);
    if (stat.kind !== "file") return null;
    if (stat.size > READ_MAX_BYTES) return Infinity;
    return lineCount(await $.fs.read(file));
  };
}

/** The ask reason of the `adherence` checks for the call of `e`, or null. */
async function adherenceAsk($: EngineInterface, e: Args<"tool.check">) {
  if (!ADHERENCE_TOOLS.has(e.tool)) return null;
  const cwd = await $.session.cwd();
  const root = (await $.env.get("CLAUDE_PROJECT_DIR")) || cwd;
  const home = (await $.env.get("HOME")) || undefined;
  // The input of these tools has the fields that the checks read, as `Payload` gives them.
  return adherenceReason(
    { cwd, tool_name: e.tool, tool_input: e.input as Payload["tool_input"] },
    {
      read: (file) => fileText($, file, FILE_MAX_BYTES),
      root,
      home,
    },
  );
}

export const register = (on: On): void => {
  // An unknown attachment type, agent, or tool passes on with no change.
  // The settings are read only for the sandbox text, whose short form depends on `sandbox.allowUnsandboxedCommands`.
  // eval: prompt.attachment surface
  on("prompt.attachment", async ($, e, next) => {
    const result = await next(e);
    if (!ATTACHMENT_TYPES.includes(e.type)) return result;
    const settings =
      e.type === "sandbox_instructions" ? await $.settings.read() : undefined;
    const text = attachmentText(e.type, result?.text ?? e.text, settings);
    return text === undefined ? result : { text };
  });
  // eval: agent.offer surface
  on("agent.offer", async (_$, e, next) =>
    isDropped(e.agent) ? { isOffered: false } : next(e),
  );
  // eval: tool.describe surface
  on("tool.describe", async (_$, e, next) => {
    const answer = await next(e);
    return toolAnswer(e.tool, answer) ?? answer;
  });
  // A `Bash` command that prints a file, also in one part of a compound command, is denied here, and the `Read` call of the same range runs instead (design D22).
  // The deny runs before the `sembr` rewrite, because a denied call is not run.
  // The session folder is read only for a command that prints a file, because a relative path needs it.
  // eval: tool.call Bash reads
  on("tool.call", { tool: "Bash" }, async ($, e, next) => {
    if (!printsOf(e.command, "").length) return next(e);
    const cwd = await $.session.cwd();
    const deny = await printReason(
      { tool_name: "Bash", tool_input: { command: e.command }, cwd },
      countOf($),
    );
    return deny ? { deny } : next(e);
  });
  // The `sembr` rewrites run only here (design D29).
  // Claude Code checks `old_string` before a classic hook runs, so only a module can repair it (probe 2.29).
  // A file that is absent passes on with no change.
  // The hook asks `$.fs.exists` first, because `$.fs.read` documents no error code for a missing file.
  // A rule that throws is a defect: Claude Code logs it, skips the hook, and runs the call as written.
  // eval: tool.call Write sembr
  on("tool.call", { tool: "Write" }, (_$, e, next) => next(writeInput(e)));
  // eval: tool.call Edit sembr
  on("tool.call", { tool: "Edit" }, async ($, e, next) => {
    const file = (await $.fs.exists(e.file_path))
      ? await $.fs.read(e.file_path)
      : null;
    return next(editInput(e, file));
  });
  // eval: tool.call Bash sembr
  on("tool.call", { tool: "Bash" }, (_$, e, next) => next(commandInput(e)));
  // eval: tool.check guard adherence
  on("tool.check", async ($, e, next) => {
    const verdict = await next(e);
    if (verdict?.decision === "deny") return verdict;
    const reasons = [await guardAsk($, e), await adherenceAsk($, e)].filter(
      (reason) => !!reason,
    );
    const reason = reasons.join("\n\n");
    return reason ? { decision: "ask", reason } : verdict;
  });
};
