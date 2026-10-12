// The manifest of the slice `decide`: the tool `second_opinion`, which asks Jev, and the command `dotclaude-decide`.
// Jev answers through the TypeSafe API. When Jev gives no answer, a small Claude model answers through `$.model.complete`.

import type { Handler, Slice } from "../../../../kernel/slice.ts";
import {
  onAskUserQuestion,
  onSecondOpinion,
  onSessionStart,
} from "./adapters/mod.ts";

export const slice = {
  name: "decide",
  mod: [
    {
      event: "session.start",
      // The filter matches each start, because the mod runtime refuses two `session.start` handlers with no filter.
      filter: { isInteractive: [true, false] },
      phase: "observe",
      run: onSessionStart,
    },
    {
      event: "tool.call",
      filter: { tool: ["AskUserQuestion"] },
      phase: "rewrite",
      // The filter narrows `e` to `AskUserQuestion`, so `run` has one cast to the wide type, as in `sembr`.
      run: onAskUserQuestion as unknown as Handler<"tool.call">,
    },
    {
      event: "tool.call",
      filter: { tool: /^mcp__dotclaude__second_opinion$/ },
      phase: "answer",
      run: onSecondOpinion,
    },
  ],
  cli: { bin: "dotclaude-decide" },
} satisfies Slice;
