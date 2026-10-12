// The manifest of the `attribution` slice: the `tool.call` rewrite that adds the attribution lines to a `git commit` and a `gh pr create` (design D39).
// The phase is `rewrite`, and within it the slice name orders it before the `sembr` slice, so the rewrite of the heredoc sees the trailer.
// The filter is needed, because `claude plugin validate` refuses two `tool.call` hooks with no matcher in one module.
// `ModHandler.run` has the type of a hook with no filter, so `run` has one cast to the wide type, as in the `sembr` slice.

import type { Handler, Slice } from "../../../../kernel/slice.ts";
import { onToolCall } from "./adapters/mod.ts";

export const slice = {
  name: "attribution",
  mod: [
    {
      event: "tool.call",
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow:
          "plugins/dotclaude/tests/attribution.test.ts > a call that is not a commit or a pull request keeps its command",
        text: "plugins/dotclaude/tests/attribution.test.ts > a `git commit -m` gets the trailer of the main model, before the message",
      },
      filter: { tool: ["Bash"] },
      phase: "rewrite",
      run: onToolCall as unknown as Handler<"tool.call">,
    },
  ],
} satisfies Slice;
