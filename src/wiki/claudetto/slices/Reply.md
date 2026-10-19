# Reply

This page tells how the core plugin `claudetto` adds a `Reply` button under each message of Claude.
A user who answers a message of Claude in the terminal and a contributor who edits the `reply` slice read it.

## What the Slice Does

The slice draws a dim `Reply` button under each message of Claude.
A press of the button puts the text of the message in the prompt box as a `>` quote.
Then you write your answer below the quote, and you do not copy the message by hand.

The slice has one hook, `ui.render` on the component `AssistantMessage`, with the phase `answer`.
The hook draws the button.
The press handler of the button fills the prompt, so the slice needs no `ui.press` hook.
The slice has no `userConfig` key, no command, and no setting.

## The Quote

A press adds this text to the prompt:

- Each line of the message, with `> ` before it.
- A blank line after the quote, where your answer starts.

The prompt fill uses the mode `insert`.
It keeps the text that you typed already and puts the quote at the cursor.

## Bounds

| Bound | Value | Set in |
| --- | --- | --- |
| `QUOTE_MAX_LINES` | 12 | `slices/reply/limits.ts` |

A message with more than 12 lines keeps its first 12 lines in the quote.

## Edge Cases

- A message with no text, or with only blank space, gets no button.
- The hook draws the built-in message first and adds the button under it, so the message stays as Claude Code draws it.
- Trailing blank space of a quoted line is cut.

## Off Switch

The slice has no `userConfig` key and no switch of its own.

## Related Pages

- [Prompt](Prompt): the system prompt that the core plugin gives to Claude.
- [Styles](Styles): the output styles of the core plugin.
- [Off Switches](Off-Switches): the ways to turn a part off.
