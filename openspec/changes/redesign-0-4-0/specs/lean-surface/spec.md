## MODIFIED Requirements

### Requirement: Readability Bounds

The lint step SHALL fail for a function above a cognitive complexity of 15 or a source file above the line bound in `tools/limits.ts`, in `plugins/`, `tools/`, and `dev/`.

#### Scenario: Complex Function

- **WHEN** a function in `plugins/claudetto/modules/` has a cognitive complexity of 16
- **THEN** `just check` fails and names the function

## REMOVED Requirements

### Requirement: Evidence for Each Control

**Reason**: Its only check was a test of the text of the page `Controls.md` (fault 24). The rule of `.claude/rules/test-behavior.md` deletes a test of prose (the user, 2026-10-26).
**Migration**: The review of a release reads `src/wiki/claudetto/rationale/Controls.md`.
