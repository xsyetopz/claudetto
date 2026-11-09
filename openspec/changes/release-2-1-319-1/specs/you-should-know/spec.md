## ADDED Requirements

### Requirement: The Model and Effort Have Defaults

The observer SHALL use `claude-haiku-5-5` when `sideCheckModel` is not a non-empty string, and effort `high` when `sideCheckEffortLevel` is not one of `low`, `medium`, `high`, `xhigh`, `max` (`register.ts:56-72`). It SHALL read both options once at registration.

#### Scenario: No Options

- **WHEN** `sideCheckEnabled` is `true` and no model or effort option is set
- **THEN** a check asks `claude-haiku-5-5` at effort `high`

#### Scenario: A Bad Effort

- **WHEN** `sideCheckEffortLevel` is `"turbo"`
- **THEN** the check runs at effort `high`

### Requirement: The Reply Carries a Tag and Explanation Cards

The parser (`note.ts:64-94`) SHALL read the first `learn:` line, the first `tag:` line, and everything from the first `explain:` line on, with the key in any case. The tag SHALL be `Heads up` when the value reads `heads up` or `heads-up`, and `You should know` otherwise. The explanation SHALL be split into at most 4 cards (`note.ts:166-173`): a `**title**` or `# title` line opens a card, text before a fenced block is the lead, the block is the sketch, and text after it is the caption.

#### Scenario: Heads Up

- **WHEN** the reply holds `learn: The push deletes the branch.` and `tag: Heads-up`
- **THEN** the offer shows the tag `Heads up`

#### Scenario: A Card With a Sketch

- **WHEN** the explanation holds `**Title**`, a lead line, a fenced block of 3 lines, and a caption line
- **THEN** one card has that title, lead, 3 sketch lines, and caption

#### Scenario: Five Titles

- **WHEN** the explanation holds five titled cards
- **THEN** only the first four are kept

### Requirement: Card Text Is Capped

A card title SHALL be cut at 120 characters, a sketch SHALL hold at most 12 lines of at most 120 characters, and the lead and the caption SHALL each be cut at 4,000 characters at a word boundary (`note.ts:8-25`, `clipAtWord`). The offer line shown SHALL be cut at 240 characters.

#### Scenario: A Long Sketch

- **WHEN** a fenced block holds 20 lines
- **THEN** the card keeps the first 12

#### Scenario: A Long Lead

- **WHEN** a lead holds 5,000 characters
- **THEN** the card holds at most 4,000, ending at a word

### Requirement: Each View Has Its Own Buttons

The offer, asked, and explained views SHALL each show their own buttons (`view.ts:37-66`). Hotkeys SHALL be set only on the `terminal` surface (`view.ts:132`). `That was helpful`, `Understood`, and `Knew this already` SHALL add the line to the known list and close the view; `Not relevant` and `Couldn’t understand` SHALL only close it (`register.ts:261-306`).

#### Scenario: Asked View

- **WHEN** the person presses Dismiss on an offer
- **THEN** the asked view shows "Dismissed." and the buttons `That was helpful`, `Not relevant`, `Couldn’t understand`, and `Dismiss`

#### Scenario: Offer and Explained Views

- **WHEN** an offer has a card, and then the person presses `Learn more`
- **THEN** the offer shows `Learn more`, `Knew this already`, and `Dismiss`, and the explained view shows `Understood`, `Chat in main session`, and `Dismiss`

#### Scenario: Not Relevant

- **WHEN** the person presses `Not relevant` on the asked view
- **THEN** the view closes and the line stays out of the known list

#### Scenario: Desktop Surface

- **WHEN** the surface is `desktop`
- **THEN** the buttons carry no hotkey
