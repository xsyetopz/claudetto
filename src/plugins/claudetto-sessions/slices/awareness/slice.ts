// The manifest of the `awareness` slice: one note about the seven-day limit, for the main agent.
// `session.measure` reads the windows that the last response reported, and `tool.call` gives the note once.

import type { Slice } from "../../../../kernel/slice.ts";
import { onMeasure, onNote } from "./adapters/mod.ts";

const LAB = "plugins/claudetto-sessions/tests/awareness.test.ts";

export const slice = {
  name: "awareness",
  ladder: "mod: the `session.measure` and `tool.call` hooks",
  mod: [
    {
      event: "session.measure",
      phase: "observe",
      run: onMeasure,
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow: `${LAB} > a weekly share below the bound makes no note`,
        text: `${LAB} > a weekly share at the bound makes one note, and a handler error does not stop the session`,
      },
    },
    {
      event: "tool.call",
      phase: "observe",
      run: onNote,
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow: `${LAB} > a subagent's call takes no note`,
        text: `${LAB} > the main agent gets the note once`,
      },
    },
  ],
} satisfies Slice;
