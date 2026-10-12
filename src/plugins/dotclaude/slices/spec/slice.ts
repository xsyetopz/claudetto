// The manifest of the `spec` slice: the CLI `dotclaude-spec`, which writes the spec store.

import type { Slice } from "../../../../kernel/slice.ts";

export const slice = {
  name: "spec",
  cli: { bin: "dotclaude-spec" },
} satisfies Slice;
