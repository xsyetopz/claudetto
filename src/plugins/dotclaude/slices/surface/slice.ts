// The manifest of the `surface` slice: the descriptions of the built-in tools that dotclaude shortens or defers,
// and the built-in agent types that it drops from the listing and from dispatch.
// The tool ids of the filter are the ids of the transforms in `transforms/`, and the test of the slice checks that they match.
// The phase is `answer`, because each handler answers with the value of the engine or with its own.

import type { Slice } from "../../../../kernel/slice.ts";
import { onAgentOffer, onToolDescribe } from "./adapters/mod.ts";

export const slice = {
  name: "surface",
  mod: [
    {
      event: "tool.describe",
      filter: { tool: ["Agent", "Bash", "Read", "ListAgents"] },
      phase: "answer",
      run: onToolDescribe,
    },
    { event: "agent.offer", phase: "answer", run: onAgentOffer },
  ],
} satisfies Slice;
