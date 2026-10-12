// The manifest of the `spec` slice: the CLI `dotclaude-spec`, which writes the spec store,
// and the two mod handlers that move the lane of a package for `/ship`: `doing` at the start of its `implementer`, `review` at its end.

import type { Slice } from "../../../../kernel/slice.ts";
import { onComplete, onSpawn } from "./adapters/mod.ts";

const LAB = "plugins/dotclaude/tests/ship-lane.test.ts";

export const slice = {
  name: "spec",
  mod: [
    {
      event: "agent.spawn",
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow: `${LAB} > a spawn with no brief in its prompt moves no lane`,
        text: `${LAB} > the spawn of an implementer moves its package to \`doing\``,
      },
      filter: { subagentType: /(?:^|:)implementer$/ },
      phase: "observe",
      run: onSpawn,
    },
    {
      event: "turn.complete",
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow: `${LAB} > the end of another subagent moves no lane`,
        text: `${LAB} > the end of an implementer moves its package to \`review\``,
      },
      filter: { agentId: /./ },
      phase: "observe",
      run: onComplete,
    },
  ],
  cli: { bin: "dotclaude-spec" },
} satisfies Slice;
