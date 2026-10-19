// The manifest of the `reply` slice: a `Reply` button under each message of Claude.
// A press puts the message in the prompt box as a `>` quote, so the user answers it and does not copy it by hand.
// The `ui.render` hook on `AssistantMessage` draws the button, and the `onPress` closure of the button fills the prompt, so no `ui.press` hook is needed.

import type { Slice } from "../../../../kernel/slice.ts";
import { onRender } from "./adapters/mod.ts";

const LAB = "plugins/claudetto/tests/reply.test.ts";

export const slice = {
  name: "reply",
  ladder: "mod: the `ui.render` hook on `AssistantMessage`",
  controls: [
    {
      name: "reply button",
      incident:
        "the user copied messages of Claude by hand to answer them (the user, 2026-10-18)",
      removeWhen:
        "Claude Code has its own action that quotes a message in the prompt.",
    },
  ],
  mod: [
    {
      event: "ui.render",
      filter: { component: "AssistantMessage" },
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow: `${LAB} > a message with no text gets no \`Reply\` button`,
        text: `${LAB} > a press of \`Reply\` fills the prompt with the message as a \`>\` quote`,
      },
      phase: "answer",
      run: onRender,
    },
  ],
} satisfies Slice;
