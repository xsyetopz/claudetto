// The transform of the built-in description of the `Agent` tool, keyed by its tool id.
// The description replaces the built-in text only when the replacement is shorter (`domain/tools.ts`).
// The text is a shorter form that dotclaude writes, not a copy of the built-in text.

import { TOOL_AGENT } from "../texts.ts";

export const AGENT = { id: "Agent", description: TOOL_AGENT } as const;
