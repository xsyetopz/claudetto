## MODIFIED Requirements

### Requirement: Shorter Than the Default

A hook lab test SHALL fail when the `tool.describe` text of a kept tool is not shorter than the built-in text.
`agents/main.md` replaces the whole system prompt, so it has no size bound, and each rewrite makes it shorter with no lost behavior, and no arbitrary custom limit sets the size (the user, 2026-10-23).

#### Scenario: Longer Replacement

- **WHEN** the `tool.describe` text of `Bash` has as many characters as the built-in text, or more
- **THEN** the hook lab test fails and names `Bash`

### Requirement: Run the Free Check

No surface SHALL let Claude report a claim as not verified when a free local check can verify it.
Claude SHALL run each free check before the report, and SHALL name a claim as not verified only when its check needs a paid run, a login, a block, or the user, with that check.
The eval cases `free-check-runs` and `partial-verification` check this behavior.

#### Scenario: Free Check Runs

- **WHEN** a claim can be checked with a local command that makes no model call and needs no login
- **THEN** Claude runs the command before the report and gives its result, not a proposal to run it

#### Scenario: Paid Check Is Named

- **WHEN** the only check of a claim is a paid sandbox run
- **THEN** Claude names the claim as not verified, gives the run, and asks with its cost

### Requirement: One Rule per Case

Two texts in one request SHALL NOT give conflicting rules for one case, and a text SHALL NOT restate a rule that another text of the same request holds.
The text audit in `research/text-audit.md` SHALL check each text for this rule, because a code test cannot judge a conflict of meaning.

#### Scenario: Conflict

- **WHEN** `main.md` says "wait for the agent" and another text says "go on with independent work"
- **THEN** the audit row of each text names the conflict and both texts

## REMOVED Requirements

### Requirement: Behavior Kept

**Reason**: Its only check was an audit test of the wording of each text. The rule of `.claude/rules/tests.md` deletes a test of prose (the user, 2026-10-26).
**Migration**: The eval cases check the behavior of the texts, and the requirement "Shorter Than the Default" checks the size.

### Requirement: Positive Framing

**Reason**: Its only check was a lint test of the wording of each text (`do not`, `never`). The rule of `.claude/rules/tests.md` deletes a test of prose (the user, 2026-10-26).
**Migration**: None. The eval cases check the behavior that each text causes.
