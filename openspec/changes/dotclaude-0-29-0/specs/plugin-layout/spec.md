## RENAMED Requirements

- FROM: `### Requirement: No Node in the hooks module graph`
- TO: `### Requirement: No Node or Bun API in the hooks module graph`

## MODIFIED Requirements

### Requirement: Runtimes

What needs Python SHALL use Python.
All other code SHALL be TypeScript in `.ts` files that run on Bun 1.4.3 or later, with no build step (design D11).
The code SHALL use only erasable syntax, and each relative import SHALL name its `.ts` extension.
Runtime code under `plugins/` SHALL import only `node:` modules, `bun:` modules, and relative `.ts` files.
Code in `plugins/`, `tests/`, and `tools/` SHALL use the Bun API where the map of design D28 gives one, and SHALL import a `node:` module only where the map gives none.
Tests SHALL run with `bun test`, and `tools/` SHALL run on Bun 1.4.3 or later, with `bun install` for the dev dependencies.
The type check SHALL run with `bun check`.

#### Scenario: Runtime file

- **WHEN** a test reads a runtime file under `plugins/`
- **THEN** the file is `.ts` or Python, and imports only `node:` modules, `bun:` modules, and relative `.ts` files

#### Scenario: Bun API in place of a node module

- **WHEN** a file under `plugins/`, `tests/`, or `tools/` imports `node:child_process`, `node:test`, or `node:url`
- **THEN** the Bun API test fails and names the file and the Bun API of design D28

#### Scenario: Type check

- **WHEN** `just check` runs `bun check`
- **THEN** it reports no error

#### Scenario: Bun commands

- **WHEN** a test reads `hooks.json`, the status line command, and the scripts of `package.json`
- **THEN** each command starts with `bun`, no command starts with `node`, `npx`, or `pnpm`, and `packageManager` is `bun@1.4.3`

#### Scenario: Non-erasable syntax

- **WHEN** a file under `plugins/` has an `enum`
- **THEN** the check fails and names the file

### Requirement: Shipped file types

A plugin SHALL NOT ship a `.js` file or a `.mjs` file.
Each runtime file SHALL be `.ts` or Python, or a file that the generator writes, such as `hooks.json`.

#### Scenario: Shipped file

- **WHEN** a test lists the files under `plugins/`
- **THEN** no file is `.js` or `.mjs`

### Requirement: Feature layout

`plugins/dotclaude/` SHALL hold one folder `features/<name>/` for each concern, with `rules.ts` for pure logic and `limits.ts` for its own bounds.
`hooks/register.ts` SHALL be the only mod module.
Each classic hook SHALL live at `hooks/<event-type>/<hook-name>.<ext>`, and the generator SHALL write `hooks.json` from these files.

#### Scenario: Feature folder

- **WHEN** a test lists `plugins/dotclaude/features/`
- **THEN** each folder holds `rules.ts` and `limits.ts`

#### Scenario: Module size trigger

- **WHEN** `hooks/register.ts` has more than 250 lines
- **THEN** the next feature is an add-on plugin with its own module

#### Scenario: Classic hook folder

- **WHEN** a test lists the classic hooks of a plugin
- **THEN** each file is in a folder named for its event, and `hooks.json` names each file

### Requirement: Bounds in three tiers

A bound that two or more parts read at runtime SHALL be in `plugins/dotclaude/lib/budget.ts`.
A bound that one feature reads SHALL be in `features/<name>/limits.ts`, or in the own module of an add-on plugin.
A bound that only tests and tools read, such as the file size bounds and `START_TOKENS`, SHALL be in `tools/limits.ts`.
The generator SHALL copy a bound into a generated file from its tier, and SHALL NOT keep a second source.

#### Scenario: Repository bound in a plugin

- **WHEN** a test searches `plugins/` for `FILE_MAX_LINES`, `TEST_FILE_MAX_LINES`, and `START_TOKENS`
- **THEN** it finds none, because those bounds are in `tools/`

### Requirement: No Node or Bun API in the hooks module graph

A file in the import graph of the mod module SHALL have no `node:` import, no `bun:` import, and no use of the `Bun` global, because Claude Code loads the module in its mod runtime and not as a Bun process (design D11).

#### Scenario: Hooks module graph

- **WHEN** a test parses `hooks/register.ts` and each file it imports
- **THEN** none has a `node:` or `bun:` import, and none reads `Bun`

### Requirement: Dependency rule

An entry point (`hooks/register.ts`, a classic hook, a `features/*/cli.ts`, a skill script, or the status line) SHALL import only its own feature and `lib/`.
A feature SHALL import only `lib/` and its own folder, and SHALL NOT import another feature.
`lib/` SHALL import only `lib/`.
No plugin SHALL import a file of another plugin.
`tools/` and `tests/` MAY import `plugins/`, and `plugins/` SHALL NOT import them.

#### Scenario: Import boundary test

- **WHEN** the import-boundary test parses the `import` lines of each plugin file
- **THEN** it fails on a feature that imports another feature, a `lib/` file that imports a feature, a plugin that imports another plugin, a plugin that imports `tools/`, and a `node:` or `bun:` import in the graph of `hooks/register.ts`

## ADDED Requirements

### Requirement: Tool checks in the hooks module

Each check that denies or rewrites a tool call SHALL run in a `tool.call` hook of `hooks/register.ts` (design D26).
Each check that asks the user before a tool call SHALL run in a `tool.check` hook of `hooks/register.ts` (`research/probes.md`, 2.2).
The logic of each check SHALL be in a feature with no `node:` or `bun:` import.
A classic hook SHALL stay only for a need that the hooks module cannot serve, and `research/cut.md` SHALL give the reason for each one.

#### Scenario: Check in the module

- **WHEN** the hook lab gives `hooks/register.ts` a `Bash` call that a check denies
- **THEN** the hook returns `{ deny }` with the reason, and `hooks.json` has no classic `PreToolUse` hook for that check

#### Scenario: Ask in the module

- **WHEN** the hook lab gives `hooks/register.ts` a `Write` call that changes an existing line of a test file
- **THEN** the `tool.check` hook returns `{ decision: "ask" }` with the reason, and `hooks.json` has no classic `PreToolUse` hook for that check

### Requirement: Same commands on each platform

Each `just` recipe SHALL run on Windows, Linux, and macOS, through Bun scripts with `Bun.$` and not shell-only syntax.
Code SHALL build paths with `node:path`, `import.meta.dir`, and `Bun.fileURLToPath`, and SHALL NOT join paths with a literal `/`.
A file in the import graph of a hooks module SHALL join paths with `/`, because the mod runtime has no path API and no `node:path`.

#### Scenario: CI platforms

- **WHEN** CI runs `just check` on Windows, Linux, and macOS
- **THEN** each run passes

#### Scenario: Path join

- **WHEN** a test searches `plugins/` and `tools/`, outside the import graphs of the hooks modules, for a path built with a literal `/` join
- **THEN** it finds none
