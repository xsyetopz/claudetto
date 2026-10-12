// The transform of the built-in description of the `Bash` tool, keyed by its tool id.
// The description replaces the built-in text only when the replacement is shorter (`domain/tools.ts`).
// The text is a shorter form that dotclaude writes, not a copy of the built-in text.

import { TOOL_BASH } from "../texts.ts";

export const BASH = { id: "Bash", description: TOOL_BASH } as const;
