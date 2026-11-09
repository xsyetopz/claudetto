## ADDED Requirements

### Requirement: One Channel per Question

A question for the person SHALL go only through the popup, and a `- [ ]` item under `## What I Need from You` SHALL hold only a `! <command>` the person must run. The output style, the Stop check, and the `claudetto-you-should-know` agent SHALL agree on this, so one question reaches the person once.

#### Scenario: A Question Written as an Item

- **WHEN** a reply holds `- [ ] Say "add them" and I'll write items 11 to 13`
- **THEN** the Stop block says to ask it through the popup and to drop the item, and the resend shows the popup only

#### Scenario: One Question, One Prompt

- **WHEN** the agent asks one question through the popup
- **THEN** no checklist item and no side-agent nudge repeats it
