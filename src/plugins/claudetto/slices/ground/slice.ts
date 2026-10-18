// The manifest of the `ground` slice: the deny of a plan or a spec that has a claim with no source.
// The check runs with no model call, and a claim passes when it names a source or is marked `(proposed)`.
// The filter is needed, because `claude plugin validate` refuses two `tool.call` hooks with no matcher in one module.

import type { Handler, Slice } from "../../../../kernel/slice.ts";
import { onPlanCall } from "./adapters/mod.ts";

const LAB = "plugins/claudetto/tests/plan.test.ts";

export const slice = {
  name: "ground",
  ladder: "mod: the `tool.call` hook",
  controls: [
    {
      name: "source check",
      incident:
        "Claude wrote a number, a `file:line` reference, or a convention (`npx` in a `bun` project) with no source (trim design, step 9).",
      removeWhen:
        "Claude cites only sources that exist, shown by a replay with no false claim.",
    },
  ],
  mod: [
    {
      event: "tool.call",
      evals: {
        requests: 0,
        tokens: 0,
        blocks: true,
        allow: `${LAB} > a claim that names its source passes`,
        text: `${LAB} > a claim with no source is denied with the three ways out`,
        block: `${LAB} > a claim with no source is denied with the three ways out`,
        false: `${LAB} > a write of another file is not checked`,
      },
      filter: { tool: ["Write", "Edit"] },
      phase: "check",
      run: onPlanCall as unknown as Handler<"tool.call">,
    },
  ],
} satisfies Slice;
