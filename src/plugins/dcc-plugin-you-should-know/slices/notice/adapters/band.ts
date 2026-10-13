// The band above the prompt: the topic of the pending action, with a heads-up choice and a dismiss choice.
// The band draws the tree that `$.ui.resolve` builds, so the terminal and the desktop surfaces draw the same rows.

import type { EngineInterface, RenderInput, RenderElement } from "claude-code";

/** The address of the heads-up choice, which `ui.press` names. */
export const HEADS_UP = "heads_up";

/** The address of the dismiss choice, which `ui.press` names. */
export const DISMISS = "dismiss";

/** The band of one topic, drawn in the `AbovePrompt` component of `e`. */
export const bandOf = (
  $: EngineInterface,
  e: RenderInput<"AbovePrompt">,
  topic: string,
): RenderElement => {
  const { Box, Text, Button } = $.ui.resolve(e);
  return Box({
    flexDirection: "column",
    marginTop: 1,
    children: [
      Text({ wrap: "wrap", children: `You should know: ${topic}` }),
      Button({ key: HEADS_UP, label: "Give a heads-up", hotkey: "1" }),
      Button({ key: DISMISS, label: "Dismiss", hotkey: "0" }),
    ],
  });
};
