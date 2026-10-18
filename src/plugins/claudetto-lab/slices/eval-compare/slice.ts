import type { Slice } from "../../../../kernel/slice.ts";

export const slice = {
  name: "eval-compare",
  ladder:
    "built-in: a plugin `bin/` command and a skill, because the compare runs with no hook",
  cli: { bin: "claudetto-eval-compare" },
  skills: ["eval-compare"],
} satisfies Slice;
