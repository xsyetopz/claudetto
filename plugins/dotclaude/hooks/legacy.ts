// The hand-written hooks of dotclaude that no slice has yet, which the generated `register.ts` calls after the slice handlers.
// The rebuild list `tools/rebuild-pending.txt` names this file, and each package that ports a feature removes its hooks here.
// The hooks:
// the surface hooks (`prompt.attachment`, `agent.offer`, `tool.describe`) that cut attachments, agent lines, and tool schemas by exact id.
// Permission rules and the sandbox of the settings snippet cover the other dangerous calls.
// The `guard` slice has the file-print deny and the ask for a repository of another owner.
//
// `claude plugin validate` follows `$` only into a function of this file,
// and each `$.env.get` call needs a literal name.
// For this reason, each function that touches `$` is here, and the rules are in `features/*/rules.ts`.

import type { On } from "claude-code";
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
};
