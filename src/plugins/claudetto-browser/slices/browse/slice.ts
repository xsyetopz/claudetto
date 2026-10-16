// The manifest of the slice `browse`: the command `claudetto-browser-guide` and the skill `browse`.

import type { Slice } from "../../../../kernel/slice.ts";

export const slice: Slice = {
  name: "browse",
  ladder:
    "built-in: a plugin `bin/` command and a skill, because the model starts the browser and no hook does",
  cli: { bin: "claudetto-browser-guide" },
  skills: ["browse"],
};
