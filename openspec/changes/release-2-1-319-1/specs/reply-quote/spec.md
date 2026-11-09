## ADDED Requirements

### Requirement: Reply Quote Command

The mod SHALL register the slash command `/reply`, which puts a quoted block in the prompt box: the line `Re:`, then each line of the quoted text behind `> `, then a blank line. It SHALL append the block to the draft and send nothing. The quoted text is the person's mouse selection (`$.ui.selection()`) when one is not blank; else paragraph N of the last assistant message with text, for `/reply N`; else the command prints the numbered paragraphs of that message and fills nothing. An N outside the paragraphs, or no assistant message, SHALL fill nothing.

The mod SHALL bind no key for it: Claude Code 2.1.319 lets a plugin name an engine keybinding action in a `Button`'s `action` but declare no chord, and `prompt.edit` raises no event for a Shift+Left that moves no caret (an empty draft or the caret at 0).

#### Scenario: Selection

- **WHEN** the person selects `Second point.` with the mouse and runs `/reply`
- **THEN** the prompt box gets `Re:\n> Second point.\n\n` appended (`hooks/reply.test.ts`)

#### Scenario: Paragraph Number

- **WHEN** nothing is selected and the person runs `/reply 1` after a reply whose first paragraph has two lines
- **THEN** both lines are quoted, each behind `> `

#### Scenario: No Part Named

- **WHEN** nothing is selected and the person runs `/reply`, or `/reply 9` past the last paragraph
- **THEN** the prompt box is untouched, and `/reply` prints the numbered paragraphs
