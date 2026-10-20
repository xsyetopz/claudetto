// The manifest of the slice `decide`: Jev answers each `AskUserQuestion` call that it is sure about, and the command `claudetto-decide`.
// The `decide` option is `jev` by default, and nothing goes out while `TYPESAFE_API_KEY` is not set. With `off`, Jev does nothing.

import type { Handler, Slice } from "../../../../kernel/slice.ts";
import { keepOptions, onAskUserQuestion, onDescribe } from "./adapters/mod.ts";
import { MODES } from "./domain/request.ts";
import { OPTION_DESCRIPTION } from "./prompts.ts";

export const slice = {
  name: "decide",
  ladder: "mod: the `tool.call` and `tool.describe` hooks",
  controls: [
    {
      name: "AskUserQuestion pick",
      incident:
        "The user had to answer a choice that the project or Jev settles (trim design, decision 9, and D66).",
      removeWhen: "Claude settles such a choice from the project with no hook.",
    },
  ],
  mod: [
    {
      event: "tool.call",
      // The entry counts the requests that the hook adds to each turn, and a session with no key adds none.
      // With the option `jev` and a key, one `AskUserQuestion` call costs one Jev request.
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow:
          "plugins/claudetto/tests/ask.test.ts > with the option off, `AskUserQuestion` passes unchanged and no process runs",
        text: "tests/claudetto/decide/ask.test.ts > a confident pick of the only question answers the call",
      },
      filter: { tool: ["AskUserQuestion"] },
      phase: "rewrite",
      // The filter narrows `e` to `AskUserQuestion`, so `run` has one cast to the wide type, as in `sembr`.
      run: onAskUserQuestion as unknown as Handler<"tool.call">,
      configure: keepOptions,
    },
    {
      event: "tool.describe",
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow:
          "plugins/claudetto/tests/ask.test.ts > `tool.describe` of `AskUserQuestion` stays as it is with no key",
        text: "plugins/claudetto/tests/ask.test.ts > `tool.describe` of `AskUserQuestion` adds the line for Jev with the option `jev` and a key",
      },
      filter: { tool: ["AskUserQuestion"] },
      phase: "answer",
      run: onDescribe as unknown as Handler<"tool.describe">,
    },
  ],
  userConfig: {
    decide: {
      type: "string",
      title: "Second Opinion",
      description: OPTION_DESCRIPTION,
      default: "jev",
      options: [...MODES],
    },
  },
  cli: { bin: "claudetto-decide" },
} satisfies Slice;
