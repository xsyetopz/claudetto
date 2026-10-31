# Spec Delta

## MODIFIED Requirements

### Requirement: The Main Agent File Is Smaller Than the Body It Replaces

`agents/main.md` SHALL be smaller than the default system body that a main-thread agent file replaces under the shipped settings, which is `3,645` characters on Claude Code `2.1.316` and `3,678` as the request carries it, since a JSON string escapes each line break. The size of `agents/main.md` SHALL be read the same way. `autoMemoryEnabled: false` takes the memory section out of that body, so the `5,627` of an unset config is not the body the file replaces (`docs/surfaces.md`, "The Baseline Moved a Third Time"). The file replaces the body and does not add to it, so a file larger than the body is a loss.

#### Scenario: File Larger Than the Body

- **WHEN** `agents/main.md` is larger than `3,678` characters as the request carries it
- **THEN** the test fails and names the file, its size, and `3,678`
