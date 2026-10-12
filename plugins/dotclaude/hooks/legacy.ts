// The hand-written hooks of dotclaude that no slice has yet, which the generated `register.ts` calls after the slice handlers.
// The rebuild list `tools/rebuild-pending.txt` names this file, and each package that ports a feature removes its hooks here.
// The hooks:
// the `tool.call` hooks of the `sembr` feature:
// `Write` and `Edit` put each sentence of a Markdown file on its own line, `Edit` also splits a cross-sentence `old_string`,
// and `Bash` does the same for the quoted heredoc of `git commit` and `gh pr create`,
// and the surface hooks (`prompt.attachment`, `agent.offer`, `tool.describe`) that cut attachments, agent lines, and tool schemas by exact id.
// Permission rules and the sandbox of the settings snippet cover the other dangerous calls.
// The `guard` slice has the file-print deny and the ask for a repository of another owner.
// The `asks` slice has the asks for a discarding `git` command and for a change to a test, a config, a hook, or a settings file.
//
// `claude plugin validate` follows `$` only into a function of this file,
// and each `$.env.get` call needs a literal name.
// For this reason, each function that touches `$` is here, and the rules are in `features/*/rules.ts`.

import type { On } from "claude-code";
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
};
