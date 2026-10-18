// The manifest of the slice `decide`: the pick of Jev for each `AskUserQuestion` question that facts decide, and the command `claudetto-decide`.
// The `decide` option is `off` by default. With `jev`, Jev answers through the TypeSafe API.

import type { Handler, Slice } from "../../../../kernel/slice.ts";
import { keepOptions, onAskUserQuestion } from "./adapters/mod.ts";
import { MODES } from "./domain/request.ts";
import { OPTION_DESCRIPTION } from "./prompts.ts";

export const slice = {
  name: "decide",
  ladder: "mod: the `tool.call` hook",
  controls: [
    {
      name: "AskUserQuestion pick",
      incident:
        "The user had to answer a choice that the project or Jev settles (trim design, decision 9).",
      removeWhen: "Claude settles such a choice from the project with no hook.",
    },
  ],
  mod: [
    {
      event: "tool.call",
      // The entry counts the requests that the hook adds to each turn, and the default option `off` adds none.
      // With the option on, one `AskUserQuestion` call costs one Jev request.
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow:
          "plugins/claudetto/tests/ask.test.ts > with the option off, `AskUserQuestion` passes unchanged and no process runs",
        text: "tests/claudetto/decide/ask.test.ts > a confident pick of a facts question goes into the picked option",
      },
      filter: { tool: ["AskUserQuestion"] },
      phase: "rewrite",
      // The filter narrows `e` to `AskUserQuestion`, so `run` has one cast to the wide type, as in `sembr`.
      run: onAskUserQuestion as unknown as Handler<"tool.call">,
      configure: keepOptions,
    },
  ],
  userConfig: {
    decide: {
      type: "string",
      title: "Second Opinion",
      description: OPTION_DESCRIPTION,
      default: "off",
      options: [...MODES],
    },
  },
  cli: { bin: "claudetto-decide" },
} satisfies Slice;
