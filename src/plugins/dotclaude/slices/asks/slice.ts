// The manifest of the `asks` slice:
// the ask before a call that discards work, adds a skipped test or a lint suppression, or changes a protected file (design D34).
// A read never asks. A change to a protected file asks unless every changed part is on the safe list of its kind.
// A write from `Bash` to a protected file, such as `sed -i`, asks.

import type { Slice } from "../../../../kernel/slice.ts";
import { onCheck } from "./adapters/mod.ts";

export const slice = {
  name: "asks",
  mod: [
    {
      event: "tool.check",
      evals: {
        requests: 0,
        tokens: 0,
        blocks: true,
        allow:
          "plugins/dotclaude/tests/asks.test.ts > a `Write` of a source file gets no ask",
        text: "plugins/dotclaude/tests/asks.test.ts > a `Write` that changes a line of a test file asks",
        block:
          "plugins/dotclaude/tests/asks.test.ts > a `Write` that changes a line of a test file asks",
        false:
          "plugins/dotclaude/tests/asks.test.ts > a `Write` of a source file gets no ask",
      },
      filter: { tool: ["Bash", "Write", "Edit", "MultiEdit"] },
      phase: "check",
      run: onCheck,
    },
  ],
} satisfies Slice;
