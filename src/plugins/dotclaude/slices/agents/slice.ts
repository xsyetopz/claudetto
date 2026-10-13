// The manifest of the `agents` slice: the six agents of the core plugin.

import type { Slice } from "../../../../kernel/slice.ts";

export const slice: Slice = {
  name: "agents",
  agents: [
    "debugger",
    "implementer",
    "investigator",
    "planner",
    "researcher",
    "reviewer",
  ],
};
