// The manifest of the `spec` slice: the CLI `dotclaude-spec`, which writes the spec store,
// and the mod handler that runs `dotclaude-spec implement <package>` at the start of an `implementer`.

import type { Slice } from "../../../../kernel/slice.ts";
import { onSpawn } from "./adapters/mod.ts";

const LAB = "plugins/dotclaude/tests/implement-brief.test.ts";

export const slice = {
  name: "spec",
  mod: [
    {
      event: "agent.spawn",
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow: `${LAB} > a spawn with no brief in its prompt runs no command`,
        text: `${LAB} > the spawn of an implementer runs \`implement\` for its package`,
      },
      filter: { subagentType: /(?:^|:)implementer$/ },
      phase: "observe",
      run: onSpawn,
    },
  ],
  cli: { bin: "dotclaude-spec" },
} satisfies Slice;
