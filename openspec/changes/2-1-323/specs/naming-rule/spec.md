## ADDED Requirements

### Requirement: Setup Offers the Naming Rule

Setup SHALL offer a `naming.md` rule file beside the other code rule files, and SHALL write it only when the user accepts it.

#### Scenario: The User Accepts the Rule

- **WHEN** the user accepts `naming.md` in setup
- **THEN** setup writes it to `.claude/rules/` with the other accepted rule files

### Requirement: Identifiers Are Headlinese

The naming rule SHALL tell the model to write identifiers in headlinese, with no articles, as in `testDeadPlayerTakesNothing`.

#### Scenario: A Test Name

- **WHEN** the model names a test for a dead player who takes no damage
- **THEN** the name holds no `a`, `an`, or `the`, as in `testDeadPlayerTakesNothing`

### Requirement: Comments Keep Their Articles

The naming rule SHALL tell the model that comments keep their articles, because the user asked for full articles in comments.

#### Scenario: A Comment

- **WHEN** the model writes a comment above a function
- **THEN** the comment keeps its articles, as in "The cache holds the last reply."

### Requirement: Titles Follow the Platform Convention

The naming rule SHALL tell the model to write Title Case where the platform convention asks for it: Markdown headings in docs, and labels in Apple UI code under the Apple Human Interface Guidelines.

#### Scenario: A Doc Heading

- **WHEN** the model writes a Markdown heading in a doc
- **THEN** the heading is in Title Case

#### Scenario: An Apple Button Label

- **WHEN** the model writes a button label in Apple UI code where the Human Interface Guidelines ask for Title Case
- **THEN** the label is in Title Case
