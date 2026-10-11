// The hooks module of dotclaude: one `tool.check` guard,
// a `prompt.compose` hook and an `agent.spawn` hook for the prompt variant of the model,
// three `tool.call` hooks, the whole `sembr` feature (design D29):
// `Write` and `Edit` put each sentence of a Markdown file on its own line, `Edit` also splits a cross-sentence `old_string`,
// and `Bash` does the same for the quoted heredoc of `git commit` and `gh pr create`,
// one `prompt.section` hook that makes the `context_management` section of the system prompt true without compaction,
// and the surface hooks (`prompt.attachment`, `agent.offer`, `tool.describe`) that cut attachments, agent lines, and tool schemas by exact id.
// The drift check (`session.start`) has its handler in `features/drift/hooks.mjs`.
// Permission rules and the sandbox of the settings snippet cover the other dangerous calls.
// This guard covers the one case that a rule cannot express:
// the first call of a session that reaches a GitHub repository of another owner with an AI policy.
// A recursive `rm` is an `ask` permission rule of the settings snippet, with the sandbox.
//
// It only asks, and it keeps a deny of the engine, so it never weakens a rule of the user.
// The hook has no catch-all on purpose.
// When it throws after `next` resolved, Claude Code logs the failure and the verdict of the engine stands, so the guard fails open.
// A `catch` here names the error that it expects, and the others reach that log.
//
// `claude plugin validate` follows `$` only into a function of this file,
// and each `$.env.get` call needs a literal name.
// For this reason, each function that touches `$` is here, and the rules are in `features/guard/rules.mjs`.

/** @import { Args, EngineInterface, On } from "claude-code" */

import { onSessionStart } from "../features/drift/hooks.mjs";
import {
  askReason,
  LOGIN_ARGV,
  linesOf,
  ORGS_ARGV,
} from "../features/guard/rules.mjs";
import { CONTEXT_MANAGEMENT } from "../features/prompt/data.mjs";
import {
  composeSections,
  variantKey,
  withBlock,
} from "../features/prompt/select.mjs";
import {
  commandInput,
  editInput,
  writeInput,
} from "../features/sembr/rules.mjs";
import {
  ATTACHMENT_TYPES,
  attachmentText,
  isDropped,
  toolAnswer,
} from "../features/surface/rules.mjs";
import { POLICY_TIMEOUT_MS } from "../lib/budget.mjs";

/**
 * The stdout of `argv`, or null when it exits with a code other than 0.
 * A run that throws is not caught: Claude Code logs it and the verdict of the engine stands.
 *
 * @param {EngineInterface} $
 * @param {readonly string[]} argv
 */
async function output($, argv) {
  const r = await $.process.run(argv, { timeoutMs: POLICY_TIMEOUT_MS });
  return r.exitCode === 0 ? r.stdout : null;
}

// The logins of the user and the organizations where the user is an admin.
// Only a complete answer is kept, so a failed `gh` call is tried again at the next check.
/** @type {string[] | undefined} */
let owners;
/** @param {EngineInterface} $ */
async function ownersOf($) {
  if (owners) return owners;
  const login = await output($, LOGIN_ARGV);
  const orgs = login === null ? null : await output($, ORGS_ARGV);
  const found = [...linesOf(login), ...linesOf(orgs)];
  if (login !== null && orgs !== null && linesOf(login).length) owners = found;
  return found;
}

// The repositories that this process checked, for each session.
/** @type {Map<string, Set<string>>} */
const checked = new Map();

/**
 * The ask reason for the call of `e`, or undefined.
 *
 * @param {EngineInterface} $
 * @param {Args<"tool.check">} e
 */
async function guardAsk($, e) {
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

// The variant key of each session, chosen at the first `prompt.compose` of the session and kept.
// A model switch changes nothing, because a changed system prompt breaks the cache.
const variants = new Map();

/**
 * @param {On} on
 * @returns {void}
 */
export function register(on) {
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
    const reason = await guardAsk($, e);
    return reason ? { decision: "ask", reason } : verdict;
  });
}
