# MiniSpec Against OpenSpec 1.14.3

Method, 2026-10-23: `openspec <command> --help` for each command of `node_modules/@fission-ai/openspec` 1.14.3, a read of `plugins/claudetto/slices/spec/adapters/cli.ts` and `domain/validate.ts`, and probes in a temp git project with one main spec `greet` (requirement `Hello`) and seven changes.
Each probe ran `validate <change> --strict --json` and `archive <change> --yes` with both CLIs on separate copies, and compared the output and the merged `spec.md`.
The installed `minispec` was the one of the plugin cache `0.3.0-alpha.1`.
`research/trim.md` line 23 says "Same five commands as upstream", which is wrong: upstream has 24 top-level commands.

## Defects: Same Input, Different Result

| Case | OpenSpec | MiniSpec |
| --- | --- | --- |
| `dup-added`: two `### Requirement: Wave` in `ADDED` | `valid: false`, ERROR `Duplicate requirement in ADDED: "Wave"`. `archive` stops at validation | `valid: true`, no issue. `archive` stops later, in the merge, with `already exists` |
| `mod-missing`: `MODIFIED` of a missing requirement | `valid: true`, INFO `Archive would refuse this delta: greet MODIFIED failed for header "### Requirement: Goodbye" - not found` | `valid: true`, no issue |
| `add-exists`: `ADDED` of a requirement that exists | INFO `Archive would refuse this delta: ... already exists` | no issue |
| `h3-scenario`: `### Scenario:` in place of `####` | INFO `Header "### Scenario: N" ... is ignored by validation`, and the ERROR | the ERROR only |
| `rem-missing`: `REMOVED` of a missing requirement | `Specs already in sync; no files changed`, and `spec.md` stays | `Specs updated successfully`, and `spec.md` gets an extra blank line |

Equal: `renamed`, `no-why`, the `archive` refusals of `mod-missing` and `add-exists`, and the task count (60 of 60).

## Output Gaps

- `status` with no `--json` prints JSON. OpenSpec prints a checklist and `Next: openspec instructions apply --change "<name>" --json`.
- The `status` JSON of OpenSpec has `nextSteps`, `isPlanningComplete`, `applyRequires`, `artifactPaths`, and `actionContext`. MiniSpec has none of them, and it adds `template`, `instruction`, `context`, `rules`, `apply`, and `tasks`, so one call does the work of `status` and `instructions`.
- `list` has no text mode. OpenSpec prints `release-0-3-0-alpha-2     3/60 tasks    2m ago`.

## Missing Commands and Flags

Workflow, which the skills or the user can need:
- `validate --specs`, `--all`, `--changes`: no check of the main specs, such as the WARNING `Purpose section is too brief (less than 50 characters)`. MiniSpec reads `--specs` as a change name.
- `instructions apply`: the task list with `done` and `line`, `contextFiles`, `progress`, and `state`.
- `instructions <artifact>`: `dependencies`, `unlocks`, and `existingOutputPaths`.
- `show <change|spec>` with `--json`, `--deltas-only`, `--diff`, and `-r`.
- `list --specs`, `--archived`, `--all`, `--sort`.
- `archive --skip-specs`, `--no-validate`, `--json`.
- `new change --description`, `--json`.
- `schemas`, `templates`, `schema which|validate|fork|init`. MiniSpec reads `openspec/schemas/` but cannot list or check a schema.
- `sync`: planned in task 9.5.

Setup and the host, out of the light scope unless the user asks: `init`, `update`, `view`, `config`, `store`, `workset`, `context`, `doctor`, `feedback`, `completion`, `version`.

Skills: OpenSpec has 7 (`propose`, `apply`, `archive`, `verify`, `explore`, `update`, `sync`). claudetto has the first 4, and D20 adds the other 3.
