// The manifest of the `start-cost` slice: the `dotclaude-start` CLI, the `/start-cost` skill that runs it,
// and a `command.run` handler that answers the typed command with the output of the CLI and no model turn.

import type { Slice } from "../../../../kernel/slice.ts";
import { onStartCost } from "./adapters/mod.ts";

const LAB = "plugins/dotclaude-sessions/tests/start-cost.test.ts";

export const slice = {
  name: "start-cost",
  mod: [
    {
      event: "command.run",
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow: `${LAB} > arguments that need a shell go to the skill`,
        text: `${LAB} > the command \`start-cost\` shows the output of the CLI`,
      },
      filter: { command: /^(?:dotclaude-sessions:)?start-cost$/ },
      phase: "answer",
      run: onStartCost,
    },
  ],
  cli: { bin: "dotclaude-start" },
  skills: ["start-cost"],
} satisfies Slice;
