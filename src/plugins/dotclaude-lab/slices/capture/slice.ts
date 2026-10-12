// The manifest of the `capture` slice: the `dotclaude-capture` CLI, a logging proxy for the requests of Claude Code.

import type { Slice } from "../../../../kernel/slice.ts";

export const slice = {
  name: "capture",
  cli: { bin: "dotclaude-capture" },
} satisfies Slice;
