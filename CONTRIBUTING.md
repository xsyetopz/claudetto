# Contributing

## Setup

- Install [Bun](https://bun.sh), [just](https://just.systems) and Claude Code.
- Run `just setup`. Its `project-types` step writes each plugin's `.claude-plugin/types` folder, which
  typechecking and lint need, with a print session that bills nothing; `just project-typecheck` reruns
  it when the folder is missing or from another Claude Code version.
- To work on this repo with claudetto loaded, load an installed copy or a copy outside the tree
  (`cp -R plugins/claudetto "$TMPDIR/claudetto"`, then `--plugin-dir "$TMPDIR/claudetto"`). Claude Code
  2.1.329 denies Bash writes inside a loaded plugin's folder under the sandbox claudetto turns on, so
  `perl -pi`, `git stash` and test fixtures in `plugins/claudetto` fail with EPERM (RISK-542).

## Layout

Each plugin lives in `plugins/<plugin>/`. Its `hooks/hooks.json` loads `hooks/register.ts`, which wires every
feature folder. Code is grouped by feature folder, so a change touches one folder and a new feature adds one.

```text
hooks/
  register.ts            entry point: calls each feature's register function
  <feature>/             one concern: guards, handover, view, request, ...
    <module>.ts
    __tests__/<module>.test.ts
  __tests__/             tests that mount the whole plugin, plus shared fixtures (testkit.ts)
```

- A feature folder holds one concern. Sibling files that share a stem (`check.ts`, `checks.ts`,
  `check-two.ts`) belong in a folder named for that stem, each file named for its role.
- Code used by several features goes in `shared/` (e.g. `shared/fault.ts`), never in a feature that others
  then import for unrelated reasons. Only `register.ts` and `hooks.json` sit at the `hooks/` top level.
- A feature with sub-concerns nests them the same way, e.g. `guards/shell/`, `guards/wall/`, `guards/redact/`;
  a data file its code reads (`betterleaks.toml`) lives beside that code.
- Keep a source module under 603 lines; past that, split it into a folder of role files (see `view/parts/`).
- Imports are relative and extension-less (`../shared/constants`).

## Tests

- A unit test goes in the `__tests__/` folder beside the module it covers and is named after it.
- A test that covers several features, or mounts the plugin through `testkit.ts`, goes in `hooks/__tests__/`.
- Tests import their kit from `claude-code/testing`.
- Run one plugin's tests with `claude plugin test plugins/<plugin>`; repository tooling tests run with
  `bun test --timeout 60000 tools`.

## Before a Pull Request

- `just verify` validates, checks gating hooks for `.catch`, typechecks and tests every shipped plugin. It
  must pass.
- A behaviour change updates the requirement it traces to in `specs/<block>.md`, and tests cite its ID
  (such as `REPLY-145`); `spec_check` lists IDs no test cites and citations no spec defines.
- A release bumps the plugin version first: `just release <plugin>`. Versions are plain SemVer
  (`X.Y.Z`). `just bump <plugin|all> [patch|minor|major|X.Y.Z]` raises or sets them; a version with a
  suffix such as `2.1.329+1` is cut to its core before the bump.

## Commits

Write the subject in the imperative and reference the issue, e.g. `Add the off command view (#57)`.
