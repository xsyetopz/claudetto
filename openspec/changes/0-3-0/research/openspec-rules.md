# Rules of OpenSpec 1.14.3 for the Commands of MiniSpec

Source: a read of `node_modules/@fission-ai/openspec/dist/` (version 1.14.3) by a subagent for task 8.2, 2026-10-22.
Each reference is `file:line` under `dist/`.
The parity test `tests/claudetto/spec/parity.test.ts` records the results of these rules on the samples.

## Facts That Change the Plan

- `openspec validate <change>` runs only the delta checks (`commands/validate.js:257`).
  The proposal rules, such as `Why section must be at least 50 characters`, run only in `archive`, and only print.
- A delta requirement with no `SHALL` or `MUST` gets a `WARNING`, not an `ERROR`.
- `skip_specs: true` is in the `.openspec.yaml` of the change, not in the schema.
  `new change` writes it when no artifact of the schema generates a file under `specs/`.

## `list --json` (`core/list.js`)

- It reads `openspec/changes/`, and a missing folder gives `[]` (`:25-33`, `:107`).
  Each folder is a change, except `archive` (`:113-115`).
  No change prints `{"changes": []}`.
- Order: newest `lastModified` first (`:153-154`), or by name with `--sort name` (`:157`).
- Item: `{name, completedTasks, totalTasks, lastModified, status}`, with `lastModified` as `toISOString()`.
  The output also has `root`.
- `status`: `no-tasks` for 0 tasks, `complete` when all are done, else `in-progress` (`:166`).
- `lastModified`: the newest `mtime` of a file under the change folder, or the folder itself with no file (`:40-73`).
- Tasks (`utils/task-progress.js`): the file of the artifact whose `generates` is `apply.tracks`, or the artifact `tasks`, or `tasks.md` (`:87-93`, `:155`).
  Task line: `/^\s*(?:[-*+]|\d{1,9}[.)])\s*\[(?:\s*([^\]\s]?)\s*\](?![([])|\s+\])\s*(.*)/` (`:53`).
  Done when the mark in lowercase is `x` (`:69`).
  Lines in code fences count too.

## `status --change <name> --json`

- Schema name: `--schema`, then `schema:` of `.openspec.yaml`, then `schema:` of `openspec/config.yaml`, then `spec-driven` (`utils/change-metadata.js:198-228`).
- Schema file: `openspec/schemas/<name>/schema.yaml`, then `$XDG_DATA_HOME/openspec/schemas/` or `~/.local/share/openspec/schemas/`, then the package (`core/artifact-graph/resolver.js:125-152`).
  Not found: `Schema '<n>' not found. Available schemas: a, b`.
- An artifact is done when its `generates` matches a file (`artifact-graph/state.js:11-30`, `outputs.js:308-349`).
  A glob such as `specs/**/*.md` matches any file that is not hidden, also `specs/x.md`.
- Status, in this order (`instruction-loader.js:231-262`):
  `skipped` (with `skip_specs` and a `generates` under `specs/`, and it counts as done), `done`, `ready` (each `requires` is done), `blocked` (with `missingDeps`).
- The artifacts are in build order, with ties in the order of the schema.
- `isComplete` and `isPlanningComplete`: each artifact is done or skipped.
- Other keys: `changeName`, `schemaName`, `planningHome`, `changeRoot`, `artifactPaths`, `applyRequires`, `nextSteps`, `actionContext`, `artifacts[{id, outputPath, status, requires, missingDeps?}]`, `root`.

## `validate <change> --json`

- A change is a folder of `changes/` that is not `archive` and has no leading `.`.
  Not found: `Unknown item '<x>'.`, exit 1.
- Output: `{items:[{id,type:"change",valid,issues,durationMs}],summary:{totals:{items:1,passed,failed},byType:{change:{...}}},version:"1.0",root}`.
- `valid` is "no `ERROR`", or with `--strict` "no `ERROR` and no `WARNING`".
  The exit code is `0` when valid, else `1` (`validator.js:879-895`).
- Issue: `{level, path, message}`, with `path` from `specs/`, such as `auth/spec.md`.
- Deltas: each `spec.md` at depth 1 or more under `specs/`.
  Sections: `## ` lines outside code fences, matched in lowercase to `added requirements`, `modified requirements`, `removed requirements`, and `renamed requirements`.
  Requirement header: `/^###\s*Requirement:\s*(.+)\s*$/i`, and the name is trimmed and matched with case.
  Body: the lines after the header up to the next header.
  `SHALL` or `MUST`: `/\b(SHALL|MUST)\b/`.
  Scenario: a `####` header with a body.
- Checks of ADDED (`validator.js:240-281`), and the same for MODIFIED with no length check:
  - `ERROR` `Duplicate requirement in ADDED: "<n>"`
  - `ERROR` `ADDED "<n>" is missing requirement text`
  - `WARNING` `ADDED "<n>" should contain SHALL or MUST (RFC 2119 best practice for English specs)`
  - `WARNING` `ADDED "<n>": Requirement text is very long (>500 characters). Move examples and edge cases into scenarios, or split it into separate requirements that each state one behavior.`
  - `ERROR` `ADDED "<n>" must include at least one scenario`
- Other `ERROR` checks: a duplicate in REMOVED or RENAMED, one name in two sections, a `FROM:` with no `TO:`.
- No delta: `ERROR` `Change must have at least one delta. No deltas found. ...` (`constants.js:50`), or with `skip_specs` an `INFO` (`validator.js:472-479`).
- `skip_specs` with files under `specs/`: `ERROR` (`:456-468`).

## `archive <name> --yes` (`core/archive.js:1077-1870`)

1. Name check, then the change must exist: `Change '<n>' not found. Available changes: a, b`.
2. Validation of the deltas without `--strict`, and any `ERROR` stops it: `Validation failed. Please fix the errors before archiving.`, exit 1.
   It prints the proposal warnings and does not stop on them.
3. `Task status: N/M tasks`.
   With open tasks and no `--yes`, it asks `Warning: N incomplete task(s) found. Continue?`, and with `--yes` it prints `Warning: N incomplete task(s) found. Continuing due to --yes flag.`
4. Archive name: `<local YYYY-MM-DD>-<name>`, or the name when it starts with a date.
   An existing target stops it before a spec changes: `Archive '<x>' already exists.`
5. Spec updates to `openspec/specs/<id>/spec.md`: `Specs to update:`, `  <id>: create|update`, then for each file `Applying changes to openspec/specs/<id>/spec.md:` and `  + N added` (and `~`, `-`, `→`), then `Totals: + a, ~ m, - r, → n` and `Specs updated successfully.`
6. Move, and `Change '<n>' archived as '<archiveName>'.`

New main spec (`specs-apply.js:1207-1212`): `# <id> Specification\n\n## Purpose\n<purpose>\n\n## Requirements\n\n<blocks joined by one blank line>\n`.
The purpose is the `## Purpose` body of the delta, or `TBD - created by archiving change <name>. Update Purpose after archive.`
MODIFIED or RENAMED on a new spec is an error.

Merge into a spec that exists (`specs-apply.js:110-501`): the file is rebuilt.
The blocks of `## Requirements` keep their order, by name with case.
The order is RENAMED, REMOVED, MODIFIED (the delta block replaces the old one, and it must keep each old scenario), then ADDED (appended at the end).
A REMOVED name that is missing gives a warning and nothing else.
Then runs of blank lines become one, and the file ends with one `\n`.

## `new change <name> --schema <s>`

- Name: `/^[a-z0-9]+(?:-[a-z0-9]+)*$/u`, with errors such as `Change name must be lowercase (use kebab-case)`.
  A failure prints `✖ Error: <msg>`, exit 1.
- `--schema` must exist: `Schema '<s>' not found. Available schemas:` and the list.
- An existing change: `Change '<name>' already exists at <abs path>`, and nothing is written.
- It makes `changes/<name>/`, `openspec/specs/`, and `openspec/changes/archive/`.
  It writes `openspec/config.yaml` as `schema: spec-driven\n` when no `config.yaml` or `config.yml` exists.
- `.openspec.yaml`: `schema: <s>\ncreated: <local YYYY-MM-DD>\n`, and `skip_specs: true` when no artifact generates under `specs/`.
- Output: `Created change '<n>' at openspec/changes/<n>/`, `Schema: <s>`, `Next: openspec status --change <n>`.
