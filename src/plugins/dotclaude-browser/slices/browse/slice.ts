// The manifest of the slice `browse`: the command `dotclaude-browser-guide` and the skill `drive-web-browser`.

import type { Slice } from "../../../../kernel/slice.ts";

export const slice: Slice = {
  name: "browse",
  cli: { bin: "dotclaude-browser-guide" },
  skills: ["drive-web-browser"],
};
