// The manifest of the `agents` slice: the seven agents of the core plugin.
// It has no mod handler, because `agent.spawn` takes no turn bound, so the bound stays in the `maxTurns` of each agent file.

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
    "test-runner",
  ],
};
