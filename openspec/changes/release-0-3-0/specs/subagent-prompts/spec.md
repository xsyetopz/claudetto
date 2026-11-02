## ADDED Requirements

### Requirement: Sectioned Subagent Bodies

Each subagent body that claudetto ships SHALL be split into named XML sections in the form `agents/main.md` uses: `<role>`, `<doing_the_work>`, `<harness_messages>`, `<when_blocked>`, and `<report_format>`, the names that `agent-conduct` allows. Each section SHALL hold one concern as prose, and each rule SHALL say what to do, with its reason beside it.

#### Scenario: Body Shape

- **WHEN** the check reads any file in `agents/` other than `main.md`
- **THEN** the body is made of named sections only, and the check fails and names the file when text sits outside a section

### Requirement: No Rule Lost in the Restructure

The restructured bodies SHALL keep every rule of the `0.2.0` bodies, unless the change log of this change names the rule as dropped and gives the reason. The frontmatter, `tools`, `effort`, and `omitClaudeMd` SHALL NOT change.

#### Scenario: Rule Kept

- **WHEN** a reviewer compares each `0.2.0` body line with the new body
- **THEN** each line has a counterpart, or appears in the list of dropped rules with its reason

### Requirement: The Report Format Is One Block

Each subagent body SHALL state its report format in one section, as tags the parent can find. `Hephaestus` keeps `<result>`, `<changed>`, `<checks>`, and `<blocks>`.

#### Scenario: Report Tags

- **WHEN** a subagent finishes a task
- **THEN** its final message holds the tags of its report section, and nothing else is required to read the result

### Requirement: Subagents Try Another Route before Reporting a Block

Each subagent body SHALL apply the FAFO method of `agents/main.md` within its own tools and files. A failing check or a hook message in the task's files SHALL be worked through to its cause. A permission denial, or a need outside its tools or files, SHALL be reported in `<blocks>` with the exact command for the parent or the user to run. A security control SHALL NOT be turned off as a route.

#### Scenario: Check Fails after an Edit

- **WHEN** the check of a `Hephaestus` task fails on a defect in the task's files
- **THEN** `Hephaestus` finds and fixes the cause, reruns the check, and reports both runs

#### Scenario: Permission Denied

- **WHEN** a tool call of a subagent is denied
- **THEN** the subagent tries no way around the denial, finishes the other parts, and names the denied call and the command the parent would run in `<blocks>`

#### Scenario: Hephaestus Block Lines

- **WHEN** the new `Hephaestus.md` is read
- **THEN** it no longer holds "When a permission rule, a hook, or a check blocks you, end the task" or "When a check fails, stop the work that it gates"
