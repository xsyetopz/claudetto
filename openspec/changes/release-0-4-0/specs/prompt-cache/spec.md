## MODIFIED Requirements

### Requirement: Prefix Stability Is Measured on the Request Body

A claim about what breaks the prompt cache SHALL be checked by comparing request bodies from an interactive session against the fake Messages API: the earlier `tools`, `system`, and `messages` SHALL be a byte-identical prefix of the later body, with `cache_control` markers and the string-or-block form of `content` left out. The check records each request body the fake API receives and compares each with the one before it.

#### Scenario: Unchanged Session

- **WHEN** a session with no plugin runs three turns on Claude Code `2.1.316`
- **THEN** every request keeps the prefix of the one before it

### Requirement: A Kept Prefix Is Not a Cache Read

A prefix kept on the fake API SHALL be reported as a kept prefix, not as a cache read, because whether the API reads its cache is not observable without a paid call.

#### Scenario: Fake API Run

- **WHEN** a session on the fake API keeps the prefix
- **THEN** the report names the kept prefix and no cache read

### Requirement: Claudetto Keeps the Prefix

claudetto's hooks, status line, and `Concise` output style SHALL NOT change an earlier part of the request mid-session; they only append.

#### Scenario: Measured Session

- **WHEN** a session on the fake API runs several turns with the plugin loaded and the shipped settings, `claudetto:Concise`, a Read and Edit turn, and a plan-mode switch
- **THEN** every request keeps the prefix of the one before it; `prompt.submit` appends `Budget: context N% left` as a `system` message, the style reminder is appended after each turn, and the status line is not in any request
