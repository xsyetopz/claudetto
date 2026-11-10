## ADDED Requirements

### Requirement: A MODIFIED Requirement That Grows Past the Limit Warns

The validator MUST warn on a MODIFIED requirement whose text holds more than 500 characters when the main spec's text for that requirement holds 500 or fewer, because archive would merge it into a main spec whose check warns on every such text. A MODIFIED requirement whose main-spec text is already over the limit MUST get no length warning, as upstream gives none. This fix only fails a change that upstream passes.

#### Scenario: A Text That Grows Past the Limit

- **WHEN** a change restates a requirement of 417 characters under MODIFIED with a text of 501 characters and validation runs strict
- **THEN** validation fails and names the requirement

#### Scenario: A Text That Was Already Long

- **WHEN** a change restates a requirement whose main-spec text holds 570 characters, and the MODIFIED text holds 560
- **THEN** the validator gives no length warning for it, as upstream gives none
