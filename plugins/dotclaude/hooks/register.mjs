// The hooks module of dotclaude: one `tool.check` guard,
// a `prompt.compose` hook and an `agent.spawn` hook for the prompt variant of the model,
// one `tool.call` hook on `Edit` that splits a cross-sentence `old_string` of a Markdown file (design D29),
// one `prompt.section` hook that makes the `context_management` section of the system prompt true without compaction,
// and the surface hooks (`prompt.attachment`, `agent.offer`, `tool.describe`) that cut attachments, agent lines, and tool schemas by exact id.
// The drift check (`session.start`) has its handler in `features/drift/hooks.mjs`.
// Permission rules and the sandbox of the settings snippet cover the other dangerous calls.
// This guard covers the two cases that a rule cannot express:
// a recursive `rm` outside the project folder,
// and the first call of a session that reaches a GitHub repository of another owner with an AI policy.
// In auto mode, the classifier decides an ask of `tool.check`,
// so `features/guard/cli.mjs` gives the same ask from a classic hook in that mode.
//
// It only asks, and it keeps a deny of the engine, so it never weakens a rule of the user.
// The hook has no `.catch` on purpose.
// When it fails after `next` resolved, the verdict of the engine stands, so the guard fails open.
//
// `claude plugin validate` follows `$` only into a function of this file,
// and each `$.env.get` call needs a literal name.
// For this reason, each function that touches `$` is here, and the rules are in `features/guard/rules.mjs`.

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
import { isMarkdown, repairEdit } from "../features/sembr/rules.mjs";
import {
  ATTACHMENT_TYPES,
  attachmentText,
  isDropped,
  toolAnswer,
} from "../features/surface/rules.mjs";
import { POLICY_TIMEOUT_MS } from "../lib/budget.mjs";

/** The stdout of `argv`, or null when it fails. */
async function output($, argv) {
  try {
    const r = await $.process.run(argv, { timeoutMs: POLICY_TIMEOUT_MS });
    return r.exitCode === 0 ? r.stdout : null;
  } catch {
    return null;
  }
}

// The logins of the user and the organizations where the user is an admin, read once.
let owners;
async function ownersOf($) {
  if (!owners) {
    const login = linesOf(await output($, LOGIN_ARGV));
    owners = login.length
      ? [...login, ...linesOf(await output($, ORGS_ARGV))]
      : [];
  }
  return owners;
}

// The repositories that this process checked, for each session.
const checked = new Map();

/** The ask reason for the call of `e`, or undefined. */
async function guardAsk($, e) {
  const [cwd, root, home, tmp, session] = await Promise.all([
    $.session.cwd(),
    $.session.root(),
    $.env.get("HOME"),
    $.env.get("TMPDIR"),
    $.session.id(),
  ]);
  if (!checked.has(session)) checked.set(session, new Set());
  return askReason(e.tool, e.input, {
    cwd,
    root,
    home,
    tmp,
    seen: checked.get(session),
    run: (argv) => output($, argv),
    owners: () => ownersOf($),
  });
}

// The variant key of each session, chosen at the first `prompt.compose` of the session and kept.
// A model switch changes nothing, because a changed system prompt breaks the cache.
const variants = new Map();

/** @type {import('claude-code').Register} */
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
  // The settings are read only for the sandbox text, which is shorter only when the sandbox has no escape.
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
  // Claude Code checks `old_string` before a classic hook runs, so only this handler can repair it (probe 2.29).
  // A file that cannot be read passes on with no change.
  on("tool.call", { tool: "Edit" }, async ($, e, next) => {
    if (!isMarkdown(e.file_path)) return next(e);
    const file = await $.fs.read(e.file_path).catch(() => null);
    return next({ ...e, ...repairEdit(file, e.old_string, e.new_string) });
  });
  on("tool.check", async ($, e, next) => {
    const verdict = await next(e);
    if (verdict?.decision === "deny") return verdict;
    const reason = await guardAsk($, e);
    return reason ? { decision: "ask", reason } : verdict;
  });
}
