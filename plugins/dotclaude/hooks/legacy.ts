// The hand-written hooks of dotclaude that no slice has yet, which the generated `register.ts` calls after the slice handlers.
// The rebuild list `tools/rebuild-pending.txt` names this file, and each package that ports a feature removes its hooks here.
// Permission rules and the sandbox of the settings snippet cover the other dangerous calls.
// The `guard` slice has the file-print deny and the ask for a repository of another owner.
//
// `claude plugin validate` follows `$` only into a function of this file,
// and each `$.env.get` call needs a literal name.
// For this reason, each function that touches `$` is here, and the rules are in `features/*/rules.ts`.

import type { On } from "claude-code";

// No hook is left here. The `surface` slice of P20 ports the `tool.describe` and `agent.offer` hooks.
export const register = (_on: On): void => {};
