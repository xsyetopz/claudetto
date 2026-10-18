// The manifest of the slice `spec`: one skill, `spec`, with the three OpenSpec schemas `task`, `story`, and `epic`, and no hook.
// OpenSpec has the engine, the `/opsx:*` commands, and the delta specs, so the slice ships only the schemas and the text that picks one.

import type { Slice } from "../../../../kernel/slice.ts";

export const slice: Slice = {
  name: "spec",
  ladder:
    "built-in: a plugin skill, because the user starts the work and OpenSpec does the rest",
  skills: ["spec"],
};
