// The manifest of the slice `notice`: the start of a turn, one check before the first call of a turn that changes something, and the band above the prompt.
// The check is a mod handler on `tool.check`, because that event comes before the tool runs, and its band does not change the verdict.
// The `tool.check` filter names the four tools that can change something, so a call to any other tool runs no handler.
// The band is drawn by a `ui.render` handler on `AbovePrompt`. Its two choices are `ui.press` handlers, and a heads-up also rides a `tool.call` handler.

import type { Slice } from "../../../../kernel/slice.ts";
import { DISMISS, HEADS_UP } from "./adapters/band.ts";
import {
  onCheck,
  onDismiss,
  onHeadsUp,
  onHeadsUpContext,
  onRender,
  onStart,
  onTurnStart,
} from "./adapters/mod.ts";
import { CHECK_TOKENS } from "./limits.ts";

const LAB = "plugins/claudetto-you-should-know/tests/notice.test.ts";
const GATE_LAB = "plugins/claudetto-you-should-know/tests/gate.test.ts";
const PLUGIN = "claudetto-you-should-know";
// The two choices of the band share one entry in `evals/hooks.json`, so they share these kinds.
const PRESS_EVALS = {
  requests: 0,
  tokens: 0,
  blocks: false,
  allow: `${LAB} > dismiss clears the band and writes no note`,
  // biome-ignore lint/plugin: a test reference "<file> > <test name>" of the eval kinds
  text: `${LAB} > a heads-up stays in the session until the main agent reads it once`,
};

export const slice = {
  name: "notice",
  ladder:
    "mod: the `session.start`, `turn.start`, `tool.check`, `ui.render`, `ui.press`, and `tool.call` hooks",
  mod: [
    {
      event: "session.start",
      phase: "observe",
      run: onStart,
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow: `${GATE_LAB} > a session with the flag on makes the check`,
        text: `${GATE_LAB} > a session with the flag off makes no check and says why once`,
      },
    },
    {
      event: "turn.start",
      phase: "observe",
      run: onTurnStart,
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow: `${LAB} > a read gets no check`,
        text: `${LAB} > the first changing call of a turn shows the topic in the band`,
      },
    },
    {
      event: "tool.check",
      filter: { tool: ["Edit", "Write", "NotebookEdit", "Bash"] },
      phase: "observe",
      run: onCheck,
      // A turn has one model call at most. The tokens are `CHECK_TOKENS`, which a test keeps above the longest prompt.
      evals: {
        requests: 1,
        tokens: CHECK_TOKENS,
        blocks: false,
        eval: "you-should-know-notice",
        allow: `${LAB} > a call that gives no topic shows no band`,
        text: `${LAB} > the first changing call of a turn shows the topic in the band`,
      },
    },
    {
      event: "ui.render",
      filter: { component: "AbovePrompt" },
      phase: "answer",
      run: onRender,
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow: `${LAB} > a call that gives no topic shows no band`,
        text: `${LAB} > the first changing call of a turn shows the topic in the band`,
      },
    },
    {
      event: "ui.press",
      filter: { plugin: PLUGIN, element: HEADS_UP },
      phase: "observe",
      run: onHeadsUp,
      evals: PRESS_EVALS,
    },
    {
      event: "ui.press",
      filter: { plugin: PLUGIN, element: DISMISS },
      phase: "observe",
      run: onDismiss,
      evals: PRESS_EVALS,
    },
    {
      event: "tool.call",
      phase: "observe",
      run: onHeadsUpContext,
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow: `${LAB} > a subagent's call takes no heads-up note, and the main agent's call does`,
        text: `${LAB} > a heads-up stays in the session until the main agent reads it once`,
      },
    },
  ],
} satisfies Slice;
