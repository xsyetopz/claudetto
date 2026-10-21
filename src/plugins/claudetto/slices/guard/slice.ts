// The manifest of the `guard` slice:
// the deny of a `Bash` command that only prints a file (design D22),
// the ask before a `git push` with a delete refspec (task 4.1 of `post-0-2-0`),
// and the ask before a `docker` command that runs or creates a container (task 3.3 of `post-0-2-0`).

import type { Handler, Slice } from "../../../../kernel/slice.ts";
import {
  onBashCall,
  onBashCheck,
  onBashCheckFail,
  onBashFail,
} from "./adapters/mod.ts";

export const slice = {
  name: "guard",
  ladder: "mod: the `tool.call` and `tool.check` hooks",
  controls: [
    {
      name: "print deny",
      incident:
        "A `Bash` print of a file gave the text again, and only `Read` gets the short stub on a second read (trim design, steps table).",
      removeWhen: "Claude Code gives the short stub for a `Bash` print too.",
    },
  ],
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
      onFail: onBashFail as unknown as Handler<"tool.call">,
    },
    {
      event: "tool.check",
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow:
          "tests/claudetto/guard/refspec.test.ts > no safe form of the corpus is found",
        text: "tests/claudetto/guard/refspec.test.ts > the rule gives the ref without the colon",
      },
      filter: { tool: ["Bash"] },
      phase: "check",
      run: onBashCheck as unknown as Handler<"tool.check">,
      onFail: onBashCheckFail as unknown as Handler<"tool.check">,
    },
  ],
} satisfies Slice;
