# reply-quote Specification

## Purpose
A `/reply` slash command that appends a quoted selection or paragraph of the last assistant message to the prompt draft, with no key bound to it.

## Requirements

### Requirement: Reply Quote Command

The mod SHALL register the slash command `/reply`, which appends to the prompt draft, and sends nothing, a block of the line `Re:`, each quoted line behind `> `, and a blank line. The quoted text SHALL be the person's mouse selection (`$.ui.selection()`) when one is not blank, else paragraph N of the last assistant message with text, for `/reply N`.

#### Scenario: Selection

- **WHEN** the person selects `Second point.` with the mouse and runs `/reply`
- **THEN** the prompt box gets `Re:\n> Second point.\n\n` appended (`hooks/reply.test.ts`)

#### Scenario: Paragraph Number

- **WHEN** nothing is selected and the person runs `/reply 1` after a reply whose first paragraph has two lines
- **THEN** both lines are quoted, each behind `> `

#### Scenario: No Part Named

- **WHEN** nothing is selected and the person runs `/reply`, or `/reply 9` past the last paragraph
- **THEN** the prompt box is untouched, and `/reply` prints the numbered paragraphs

### Requirement: Reply Binds No Key

The mod SHALL bind no key for `/reply`, because Claude Code 2.1.319 lets a plugin name an engine keybinding action in a `Button`'s `action` but declare no chord, and `prompt.edit` raises no event for a Shift+Left that moves no caret.

#### Scenario: No Chord

- **WHEN** the mod registers
- **THEN** it registers the `/reply` command and no keybinding
