// The manifest of the `guard` slice:
// the deny of a `Bash` command that only prints a file (design D22).

import type { Handler, Slice } from "../../../../kernel/slice.ts";
import { onBashCall } from "./adapters/mod.ts";

export const slice = {
  name: "guard",
  ladder: "mod: the `tool.call` hook",
  mod: [
    {
      event: "tool.call",
      evals: {
        requests: 0,
        tokens: 0,
        blocks: true,
        allow:
          "plugins/claudetto/tests/print.test.ts > a print of a file that is absent, a generated file, and a command that does not print stay allowed",
        text: "tests/claudetto/guard/print.test.ts > `cat F` is denied with the absolute path and no range",
        block:
          "plugins/claudetto/tests/print.test.ts > a `Bash` print of a file is denied with the `Read` range",
        false:
          "tests/claudetto/guard/print.test.ts > a command with an edit, a byte count, or another bounded form stays allowed",
      },
      filter: { tool: ["Bash"] },
      phase: "check",
      run: onBashCall as unknown as Handler<"tool.call">,
    },
  ],
} satisfies Slice;
