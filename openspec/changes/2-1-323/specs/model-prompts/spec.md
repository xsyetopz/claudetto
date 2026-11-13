## ADDED Requirements

### Requirement: A Compose Mod Gives Each 5.5 Model Its Own Body

A `prompt.compose` mod SHALL read `e.model` and, for `claude-opus-5-5`, `claude-sonnet-5-5`, and `claude-haiku-5-5`, replace the shared `lean_body` section with a body for that model, built from the default body and a shared core rewritten from the old `ROOT_PROMPT`. It SHALL keep the `memory`, `env_info_simple`, and `context_management` sections unchanged, because they carry live session facts.
#### Scenario: An Opus Session

- **WHEN** a session runs on `claude-opus-5-5`
- **THEN** the request's `system[2]` holds the Opus body in place of the default `lean_body`, followed by the default memory, environment, and context management sections

#### Scenario: Section Order

- **WHEN** the mod returns its section list for any of the three models
- **THEN** no `session` section comes before a `shared` one, because Claude Code skips a `prompt.compose` hook whose list breaks that order

### Requirement: Other Models Keep the Default Body

For any model other than `claude-opus-5-5`, `claude-sonnet-5-5`, and `claude-haiku-5-5`, the mod SHALL return the default sections unchanged.

#### Scenario: A Fable Session

- **WHEN** a session runs on `claude-fable-5-2`
- **THEN** `system[2]` is the default body, byte for byte

### Requirement: The Root Prompt Text Is Gone

Claudetto SHALL ship no `ROOT_PROMPT` and no other `scope: "shared"` text beside the per-model bodies, so each 5.5 model reads one body with no default text left over.

#### Scenario: Reading the Hooks

- **WHEN** a reader searches `plugins/claudetto/hooks/` for `ROOT_PROMPT`
- **THEN** no match is found

### Requirement: Each Body Has a Size Bound

The shared core SHALL stay under 3,500 characters. On top of the core, the Opus delta SHALL stay under 500 characters and the Sonnet delta under 900 characters. The Haiku body SHALL use a core trimmed to about 2,500 characters plus a delta under 700 characters, because Haiku 5.5 stops early and skips checks under a long agent prompt (`research/model-guidance.md`, Haiku 5.5). A check SHALL fail and name the model when a body passes its bound.

#### Scenario: A Body Grows Past Its Bound

- **WHEN** an edit makes the Sonnet delta 950 characters long
- **THEN** the size check fails and names `claude-sonnet-5-5`

### Requirement: The Opus Body Leaves Out Verification and Standing Delegation

The Opus 5.5 body SHALL be the shared core with no double-check or verification line, because Opus 5.5 already verifies on its own. Its delegation text SHALL say when to delegate and why, in place of a standing line that asks for delegation, because Opus 5.5 delegates readily.

#### Scenario: Reading the Opus Body

- **WHEN** a reader reads the Opus body
- **THEN** it holds no line that asks the model to double-check or verify its work, and its delegation text names the kind of work to delegate with the reason

### Requirement: The Sonnet Body Adds the Finish and Scope Paragraphs

The Sonnet 5.5 body SHALL be the shared core plus a finish paragraph and a scope-stop paragraph, because Sonnet 5.5 checks in before the work is done and adds tests, docs, and files nobody asked for (`research/model-guidance.md`, Sonnet 5.5).

#### Scenario: Reading the Sonnet Body

- **WHEN** a reader reads the Sonnet body
- **THEN** it holds a paragraph that says to keep working until the asked work is done, and a paragraph that says to add no feature, test, file, doc, or refactor that was not asked for

### Requirement: The Haiku Body Is the Shortest

The Haiku 5.5 body SHALL be the shortest of the three and SHALL hold no delegation line. The default Haiku-only paragraphs SHALL be trimmed to what the core lacks, because Haiku 5.5 degrades on a long prompt.

#### Scenario: Comparing the Bodies

- **WHEN** a reader measures the three bodies
- **THEN** the Haiku body is shorter than the Opus and the Sonnet body, and holds no delegation line
