// The manifest of the slice `advise`: the tool `advise`, an advisor that the user controls, in place of the built-in advisor.
// The `advisor` option is `builtin` by default, and then the slice registers no tool.
// With `claudetto`, the tool asks the model of `advisorModel` with the context of `domain/advise.ts`.

import type { Slice } from "../../../../kernel/slice.ts";
import { keepOptions, onAdvise, onSessionStart } from "./adapters/mod.ts";
import { ADVISORS, EFFORTS } from "./domain/advise.ts";
import { OPTION_ADVISOR, OPTION_MODEL } from "./prompts.ts";

const LAB = "plugins/claudetto/tests/advise.test.ts";

export const slice = {
  name: "advise",
  ladder: "mod: the `session.start` and `tool.call` hooks",
  mod: [
    {
      event: "session.start",
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow: `${LAB} > with the option \`builtin\`, session start registers no tool`,
        text: `${LAB} > with the option \`claudetto\`, session start registers the tool`,
      },
      // The filter matches each start, because the mod runtime refuses two `session.start` handlers with no filter.
      filter: { isInteractive: [true, false] },
      phase: "observe",
      run: onSessionStart,
      configure: keepOptions,
    },
    {
      event: "tool.call",
      // One call of the tool costs one model request, and the default option registers no tool.
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow: `${LAB} > with the option \`builtin\`, session start registers no tool`,
        text: `${LAB} > an answer gives the advice with the model name and the tokens`,
      },
      filter: { tool: /^mcp__claudetto__advise$/ },
      phase: "answer",
      run: onAdvise,
      configure: keepOptions,
    },
  ],
  userConfig: {
    advisor: {
      type: "string",
      title: "Advisor",
      description: OPTION_ADVISOR,
      default: "builtin",
      options: [...ADVISORS],
    },
    advisorModel: {
      type: "string",
      title: "Advisor Model",
      description: OPTION_MODEL,
      default: "opus",
    },
    advisorEffort: {
      type: "string",
      title: "Advisor Effort",
      description: "The effort of `advise`.",
      default: "high",
      options: [...EFFORTS],
    },
  },
} satisfies Slice;
