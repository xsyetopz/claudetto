// The manifest of the `eval-compare` slice: the `dotclaude-eval-compare` CLI, and the `/eval-compare` skill that runs it.

import type { Slice } from "../../../../kernel/slice.ts";

export const slice = {
  name: "eval-compare",
  cli: { bin: "dotclaude-eval-compare" },
  skills: ["eval-compare"],
} satisfies Slice;
