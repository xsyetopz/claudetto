# Contributing

## Setup

- Install [Bun](https://bun.sh), [just](https://just.systems) and Claude Code.
- Start one session with `claude --plugin-dir plugins/<plugin>` per plugin; Claude Code writes the
  `.claude-plugin/types` folder that typechecking needs.

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
- A behaviour change updates the requirement it traces to in `plans/rebuild/prd/`, including any test path
  the requirement cites.
- A release bumps the plugin version first: `just release <plugin>`.

## Commits

Write the subject in the imperative and reference the issue, e.g. `Add the off command view (#57)`.
