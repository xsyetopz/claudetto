// The manifest of the slice `decide`: the tool `second_opinion`, which asks Jev, and the command `claudetto-decide`.
// The `decide` option is `off` by default. With `jev`, Jev answers through the TypeSafe API, and a small Claude model answers through `$.model.complete` when Jev gives no answer.
// With `claude`, the model answers and no request goes to Jev.

import type { Handler, Slice } from "../../../../kernel/slice.ts";
import {
  keepOptions,
  onAskUserQuestion,
  onSecondOpinion,
  onSessionStart,
} from "./adapters/mod.ts";
import { MODES } from "./domain/request.ts";
import { OPTION_DESCRIPTION } from "./prompts.ts";

export const slice = {
  name: "decide",
  ladder: "mod: the `session.start` and `tool.call` hooks",
  controls: [
    {
      name: "second_opinion tool",
      incident: "none recorded",
      removeWhen: "The user drops `second_opinion`.",
    },
    {
      name: "AskUserQuestion pick",
      incident:
        "The user had to answer a choice that the project or Jev settles (trim design, decision 9).",
      removeWhen: "Claude settles such a choice from the project with no hook.",
    },
    {
      name: "small model fallback",
      incident:
        "Jev gave no answer for some causes (trim design, decision 11).",
      removeWhen: "Jev always answers.",
    },
  ],
  mod: [
    {
      event: "session.start",
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow:
          "plugins/claudetto/tests/session.test.ts > with the option off, session start registers no tool and passes the session on",
        text: "plugins/claudetto/tests/session.test.ts > with the option `jev`, session start registers the tool with its input schema",
      },
      // The filter matches each start, because the mod runtime refuses two `session.start` handlers with no filter.
      filter: { isInteractive: [true, false] },
      phase: "observe",
      run: onSessionStart,
      configure: keepOptions,
    },
    {
      event: "tool.call",
      // The entry counts the requests that the hook adds to each turn, and the default option `off` adds none.
      // With the option on, one `AskUserQuestion` call costs one request: a Jev request, or a small model completion for `claude`.
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
    {
      event: "tool.call",
      filter: { tool: /^mcp__claudetto__second_opinion$/ },
      phase: "answer",
      run: onSecondOpinion,
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
