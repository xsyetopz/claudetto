// The manifest of the `guard` slice:
// the deny of a `Bash` command that only prints a file (design D22),
// and the ask before the first call of a session that reaches a GitHub repository of another owner with an AI policy.

import type { Slice } from "../../../../kernel/slice.ts";
import { onBashCall, onCheck } from "./adapters/mod.ts";

export const slice = {
  name: "guard",
  mod: [
    { event: "tool.call", phase: "check", run: onBashCall },
    { event: "tool.check", phase: "check", run: onCheck },
  ],
} satisfies Slice;
