// The manifest of the `sandbox` slice: the `dotclaude-sandbox` CLI, which runs Claude Code in a config folder apart from yours.

import type { Slice } from "../../../../kernel/slice.ts";

export const slice = {
  name: "sandbox",
  cli: { bin: "dotclaude-sandbox" },
} satisfies Slice;
