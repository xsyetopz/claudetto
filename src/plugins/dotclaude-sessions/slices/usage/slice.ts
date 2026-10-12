// The manifest of the `usage` slice: the `dotclaude-usage` CLI, and the `/usage` skill that runs it.

import type { Slice } from "../../../../kernel/slice.ts";

export const slice = {
  name: "usage",
  cli: { bin: "dotclaude-usage" },
  skills: ["usage"],
} satisfies Slice;
