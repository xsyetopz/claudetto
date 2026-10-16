// The manifest of the `surface` slice: the descriptions of the built-in tools that claudetto shortens or defers,
// and the built-in agent types that it drops from the listing and from dispatch.
// The tool ids of the filter are the ids of the transforms in `transforms/`, and the test of the slice checks that they match.
// The phase is `answer`, because each handler answers with the value of the engine or with its own.

import type { Slice } from "../../../../kernel/slice.ts";
import { onAgentOffer, onToolDescribe } from "./adapters/mod.ts";

export const slice = {
  name: "surface",
  ladder: "mod: the `tool.describe` and `agent.offer` hooks",
  mod: [
    {
      event: "tool.describe",
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow:
          "plugins/claudetto/tests/surface.test.ts > `tool.describe` passes an unknown tool on with no change",
        text: "plugins/claudetto/tests/surface.test.ts > `tool.describe` replaces the built-in `Bash` description with a shorter one",
      },
      filter: { tool: ["Agent", "Bash", "Read", "ListAgents"] },
      phase: "answer",
      run: onToolDescribe,
    },
    {
      event: "agent.offer",
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow:
          "plugins/claudetto/tests/surface.test.ts > `agent.offer` offers an agent that is not dropped",
        text: "plugins/claudetto/tests/surface.test.ts > `agent.offer` leaves a dropped agent out of the listing",
      },
      phase: "answer",
      run: onAgentOffer,
    },
  ],
} satisfies Slice;
