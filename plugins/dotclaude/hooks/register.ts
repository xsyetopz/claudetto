// The hooks module of dotclaude: one `tool.check` guard,
// a `prompt.compose` hook and an `agent.spawn` hook for the prompt variant of the model,
// the `tool.call` hooks of the `reads` and `sembr` features:
// a `Bash` command that only prints a file gets a deny that names the `Read` call (design D22),
// `Write` and `Edit` put each sentence of a Markdown file on its own line, `Edit` also splits a cross-sentence `old_string`,
// and `Bash` does the same for the quoted heredoc of `git commit` and `gh pr create`,
// the `tool.check` ask of the `adherence` feature for a change to a test, a config, a hook, or a settings file,
// one `prompt.section` hook that makes the `context_management` section of the system prompt true without compaction,
// and the surface hooks (`prompt.attachment`, `agent.offer`, `tool.describe`) that cut attachments, agent lines, and tool schemas by exact id.
// The drift check (`session.start`) has its handler in `features/drift/hooks.ts`.
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
import { onSessionStart } from "../features/drift/hooks.ts";
import {
  askReason,
  LOGIN_ARGV,
  linesOf,
  ORGS_ARGV,
} from "../features/guard/rules.ts";
import {
  composeSections,
  variantKey,
  withBlock,
} from "../features/prompt/select.ts";
import { CONTEXT_MANAGEMENT } from "../features/prompt/texts.ts";
import { READ_MAX_BYTES } from "../features/reads/limits.ts";
import {
  type Count,
  printOf,
  printReason,
  words,
} from "../features/reads/rules.ts";
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

// The variant key of each session, chosen at the first `prompt.compose` of the session and kept.
// A model switch changes nothing, because a changed system prompt breaks the cache.
const variants = new Map();

export function register(on: On): void {
  on("prompt.compose", async ($, e, next) => {
    const result = await next(e);
    if (e.traits.includes("bare")) return result;
    const session = await $.session.id();
    if (!variants.has(session))
      variants.set(session, variantKey(e.promptModel || e.model));
    const key = variants.get(session);
    return key ? { sections: composeSections(result.sections, key) } : result;
  });
  // A subagent gets its system prompt from its agent body, so its model block goes to the end of the task prompt.
  on("agent.spawn", (_$, e, next) => {
    const model = e.model && e.model !== "inherit" ? e.model : e.parentModel;
    const key = variantKey(model);
    return next(key ? { ...e, prompt: withBlock(e.prompt, key) } : e);
  });
  on("session.start", onSessionStart);
  // The built-in `context_management` section says that the context is summarized when it grows long.
  // With `DISABLE_COMPACT` that is false, and the model then spends less care on the size of the context.
  // The text is the same for each call, so the cached answer keeps the prompt cache.
  on("prompt.section", { name: "context_management" }, async ($, e, next) => {
    const off = await $.env.get("DISABLE_COMPACT");
    return off && off !== "0" && off !== "false"
      ? { text: CONTEXT_MANAGEMENT }
      : next(e);
  });
  // An unknown attachment type, agent, or tool passes on with no change.
  // The settings are read only for the sandbox text, whose short form depends on `sandbox.allowUnsandboxedCommands`.
  on("prompt.attachment", async ($, e, next) => {
    const result = await next(e);
    if (!ATTACHMENT_TYPES.includes(e.type)) return result;
    const settings =
      e.type === "sandbox_instructions" ? await $.settings.read() : undefined;
    const text = attachmentText(e.type, result?.text ?? e.text, settings);
    return text === undefined ? result : { text };
  });
  on("agent.offer", async (_$, e, next) =>
    isDropped(e.agent) ? { isOffered: false } : next(e),
  );
  on("tool.describe", async (_$, e, next) => {
    const answer = await next(e);
    return toolAnswer(e.tool, answer) ?? answer;
  });
  // A `Bash` command that only prints a file is denied here, and the `Read` call of the same range runs instead (design D22).
  // The deny runs before the `sembr` rewrite, because a denied call is not run.
  // The session folder is read only for a command that prints a file, because a relative path needs it.
  on("tool.call", { tool: "Bash" }, async ($, e, next) => {
    const argv = words(e.command);
    if (!argv || !printOf(argv)) return next(e);
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
  on("tool.call", { tool: "Write" }, (_$, e, next) => next(writeInput(e)));
  on("tool.call", { tool: "Edit" }, async ($, e, next) => {
    const file = (await $.fs.exists(e.file_path))
      ? await $.fs.read(e.file_path)
      : null;
    return next(editInput(e, file));
  });
  on("tool.call", { tool: "Bash" }, (_$, e, next) => next(commandInput(e)));
  on("tool.check", async ($, e, next) => {
    const verdict = await next(e);
    if (verdict?.decision === "deny") return verdict;
    const reasons = [await guardAsk($, e), await adherenceAsk($, e)].filter(
      (reason) => !!reason,
    );
    const reason = reasons.join("\n\n");
    return reason ? { decision: "ask", reason } : verdict;
  });
}
