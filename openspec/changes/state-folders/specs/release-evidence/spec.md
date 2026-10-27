## MODIFIED Requirements

### Requirement: Fault Has a Test

Each fault in `.claude/claudetto/0.3.0-findings.md` and in `research/sessions.md` SHALL have a test that fails on 0.2.0 and passes on 0.3.0, or a recorded reason to keep the behavior.

#### Scenario: Fault Map

- **WHEN** the release is ready
- **THEN** a table maps each fault to its test name or its reason
