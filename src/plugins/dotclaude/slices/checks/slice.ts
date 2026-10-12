// The manifest of the `checks` slice: the CLI `dotclaude-run-checks`.
// It replaces the `test-runner` agent: a script runs a batch of check commands and prints the failures, with no model turn.

import type { Slice } from "../../../../kernel/slice.ts";

export const slice = {
  name: "checks",
  cli: { bin: "dotclaude-run-checks" },
} satisfies Slice;
