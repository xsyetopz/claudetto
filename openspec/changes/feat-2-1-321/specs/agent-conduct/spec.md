## MODIFIED Requirements

### Requirement: A Disputed Claim Is Weighed as a Third Party's

The root prompt (`texts.ts`) SHALL tell the model to weigh a disputed claim as a third party's and check it in the same turn, then state the corrected fact when the check backs the user. It SHALL tell the model to drop an act the user says nobody asked for, and to look up a credential in the repo `.env` before it asks. `Concise.md` SHALL tell the model to open with the corrected fact and restate nothing the person already has.

#### Scenario: The Check Backs the User

- **WHEN** the user disputes the last reply and the check shows the reply was wrong
- **THEN** the reply opens with the corrected fact
- **AND** the lab test is `manifest.test.ts`, which holds the byte cap of the root prompt

#### Scenario: A Waited-On Task

- **WHEN** a background task still runs at Stop and the user waits on it
- **THEN** the Stop note sends the last reply nowhere again and tells the model to follow the task's output with `Monitor`, filtered to its step and error lines
- **AND** the lab test is `limits/stop.test.ts`

### Requirement: One Command at a Time

A reply SHALL hold at most one `- ! <command>` bullet, the one the work needs first, and the next SHALL come in a later reply after the person has run it, because the person's `!` runs and messages queue while the agent works (the person, 2026-11-09). A bullet is a command bullet only when its text starts with `! ` or `` `! ``; a finding that mentions a `! <command>` step is not one. `output-styles/Concise.md` SHALL say so.

#### Scenario: Several Commands Only the Person Can Run

- **WHEN** the work needs three commands only the person can run
- **THEN** the reply lists the first as its one `- ! <command>` bullet, and the next reply, after the person's run, lists the second
- **AND** a finding bullet that mentions a `! <command>` step beside that one bullet passes
