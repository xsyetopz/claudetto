## REMOVED Requirements

### Requirement: No Model Request

**Reason**: The main agent no longer writes the `learn:` block, so a side model writes it (Jev, 2026-10-26, 0.89).
**Migration**: "Turn-End Side Model", "Haiku Request", "Haiku Token Cap", and "Side Model Limits" replace it.

## ADDED Requirements

### Requirement: Turn-End Side Model

At the end of each turn of the main agent, and of no subagent turn, the slice SHALL ask Jev whether the last user message and the last reply hold a fact that the user should know, that the session does not cover, and that is relevant and consequential.
On yes, or with no Jev key, the slice SHALL ask Haiku through `$.model.complete` for a note in the format `learn:`, `tag:` (`Heads up` or `You should know`), and `explain:`, and show "<tag> · <line>" above the prompt.

#### Scenario: Jev Says No

- **WHEN** a Jev key is set and Jev answers no for the turn
- **THEN** the slice makes no Haiku request and shows no note

#### Scenario: Jev Says Yes

- **WHEN** Jev answers yes and Haiku answers `learn: IS_DEMO also skips the trust dialog.` with `tag: Heads up`
- **THEN** the band above the prompt shows "Heads up · IS_DEMO also skips the trust dialog."

#### Scenario: No Jev Key

- **WHEN** no Jev key is set and Haiku answers `learn: none`
- **THEN** the slice shows no note

### Requirement: Haiku Request

Each Haiku request, with or without a Jev key, SHALL use the model `claude-haiku-5-5` at effort `high`, with a reply cap that leaves room for its thinking (the user, 2026-10-26).

#### Scenario: Haiku Model

- **WHEN** no Jev key is set and a main turn ends
- **THEN** the slice calls `$.model.complete` with `claude-haiku-5-5` and effort `high`

### Requirement: Haiku Token Cap

Each Haiku request SHALL stay at or under 100,000 tokens, input and reply cap together, because Haiku costs 5x above 100k (the user, 2026-10-26).
The slice SHALL trim the turn text until its UTF-8 bytes, plus the reply cap and a reserve for the CLI identity block, are at most 100,000, because no token count exists before the call and a token holds at least one byte.

#### Scenario: Long Turn

- **WHEN** the last user message and the last reply hold 400,000 bytes
- **THEN** the Haiku request text, the reply cap, and the reserve add up to at most 100,000

### Requirement: Side Model Limits

The slice SHALL make no call of `$.model.fork`, because a fork sends the whole main transcript again on the main model.
The request text SHALL hold no secret, key, or personal data of the turn.
A note SHALL show once per session for each `learn:` line, and a failed or unanswered request SHALL end the turn as usual with no note.

#### Scenario: Repeat

- **WHEN** Haiku answers a `learn:` line that the session showed before
- **THEN** the slice shows no note

#### Scenario: Model Failure

- **WHEN** the Jev or Haiku request fails or is unanswered
- **THEN** the slice shows no note and the turn ends as usual

## MODIFIED Requirements

### Requirement: Learn Block

When a main reply ends with a `learn:` line, a `tag:` line, and an `explain:` block, the slice SHALL remove the block from the shown and stored reply, also in `-p` output, and show "<tag> · <line>" above the prompt.
`learn: none` SHALL show nothing.
The body of `claudetto:main` SHALL leave the block to the side model of "Turn-End Side Model", and the parser stays for a reply that still holds a block.

#### Scenario: Learn Reply

- **WHEN** a main reply ends with `learn: IS_DEMO also skips the trust dialog.` and `tag: Heads up`
- **THEN** the band above the prompt shows "Heads up · IS_DEMO also skips the trust dialog."

#### Scenario: Learn None

- **WHEN** a main reply ends with `learn: none`
- **THEN** the slice shows no note, and the reply shows no block
