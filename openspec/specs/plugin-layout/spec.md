# plugin-layout Specification

## Purpose

Defines the layout of the repository and the plugins, the size bounds of files, the runtimes, and the plugin set of the marketplace.

## Requirements

### Requirement: Documented plugin and marketplace layout

The repository SHALL follow the layout in the Claude Code plugin docs.
The repository root SHALL be the marketplace root with `.claude-plugin/marketplace.json`.
Each plugin SHALL have its manifest at `.claude-plugin/plugin.json` and its components in the default folders of the docs.
Each component path in a manifest SHALL start with `./`, stay inside the plugin root, and exist.
Each marketplace entry name SHALL equal the manifest name.

#### Scenario: Validation

- **WHEN** `claude plugin validate` runs on the marketplace and on each plugin
- **THEN** each passes with no error

### Requirement: Bounds in three tiers

Each normal file SHALL have 300 lines or fewer.
Each test file SHALL have 500 lines or fewer.
A bound that two or more parts read at runtime, or that setup writes to the profile, SHALL be in `plugins/dotclaude/lib/budget.mjs`.
A bound that one feature reads SHALL be in `features/<name>/limits.mjs`, or in the own module of an add-on plugin.
A bound that only tests and tools read, such as the file size bounds, `START_TOKENS`, and the eval bounds, SHALL be in `tools/`.
The roster of agents SHALL NOT be a list in code, because the frontmatter of `agents/*.md` is the source.
A test SHALL enforce the file size bounds and SHALL exclude generated files by name.

#### Scenario: Long file

- **WHEN** a file has 301 lines and is not a test or a generated file
- **THEN** the test fails and names the file

#### Scenario: Long test

- **WHEN** a test file has 501 lines
- **THEN** the test fails and names the file

#### Scenario: Repository bound in a plugin

- **WHEN** a test searches `plugins/` for `FILE_MAX_LINES`, `TEST_FILE_MAX_LINES`, and `START_TOKENS`
- **THEN** it finds none, because those bounds are in `tools/`

### Requirement: Runtimes

What needs Python SHALL use Python.
Runtime JavaScript SHALL be `.mjs` files that run on Node 22.18 or later with `node:` modules only.
A file in the import graph of the hooks module SHALL have no `node:` import, because the module runs with no Node.
Repository tooling that does not ship, such as tests, `tools/`, and evals, SHALL use Bun.
A plugin SHALL NOT ship a `.js` file or a `.ts` file, except the `.test.ts` files that `claude plugin test` runs and the `types/*.d.ts` file that the manifest names.

#### Scenario: Shipped file

- **WHEN** a test lists the files under `plugins/`
- **THEN** each runtime file is `.mjs` or Python, or is a `.test.ts` hook-lab file, or is the `types/*.d.ts` file that the manifest names

### Requirement: Modder removed

`dotclaude-modder` SHALL NOT be in the marketplace or in `plugins/`.
An archive of it SHALL be in a folder that git ignores, so that the user can build their own skills or tools from it.
The docs, the README, the wiki, and the CHANGELOG SHALL state the removal.

#### Scenario: Marketplace list

- **WHEN** a test reads `marketplace.json`
- **THEN** it lists no `dotclaude-modder` entry

#### Scenario: Archive ignored

- **WHEN** the archive folder exists
- **THEN** `git status` does not show it

### Requirement: General-purpose roles

The dotclaude plugin SHALL describe itself as a set of general software-engineering roles, and SHALL NOT describe a one-time or niche role.

#### Scenario: Descriptions

- **WHEN** a test reads the plugin and agent descriptions
- **THEN** none names a game, a modding task, or another niche

### Requirement: Feature layout and dependency rule

`plugins/dotclaude/` SHALL hold one folder `features/<name>/` for each concern, with `rules.mjs` for pure logic and `limits.mjs` for its own bounds.
`hooks/register.mjs` SHALL be the only hooks module, and SHALL hold the literal `on()` lines and the top-level `$` functions.
An entry point (`hooks/register.mjs`, a `features/*/cli.mjs`, a skill script, or the status line) SHALL import only its own feature and `lib/`.
A feature SHALL import only `lib/` and its own folder, and SHALL NOT import another feature.
`lib/` SHALL import only `lib/`.
No plugin SHALL import a file of another plugin.
`tools/` and `tests/` MAY import `plugins/`, and `plugins/` SHALL NOT import them.

#### Scenario: Import boundary test

- **WHEN** the import-boundary test parses the `import` lines of each plugin file
- **THEN** it fails on a feature that imports another feature, a `lib/` file that imports a feature, a plugin that imports another plugin, a plugin that imports `tools/`, and a `node:` import in the graph of `hooks/register.mjs`

#### Scenario: Module size trigger

- **WHEN** `hooks/register.mjs` has more than 250 lines
- **THEN** the next feature is an add-on plugin with its own module

### Requirement: Add-on plugins

The marketplace SHALL list `dotclaude` and the add-on plugins `dotclaude-jev`, `dotclaude-browser`, `dotclaude-docs`, and `dotclaude-codegraph`.
A feature that costs tokens when unused, or that needs an outside tool, SHALL be an add-on plugin, so that the user can turn it off by the plugin.
Each add-on SHALL work without `dotclaude` and SHALL NOT import from it or from another add-on.

#### Scenario: Marketplace entries

- **WHEN** a test reads `marketplace.json`
- **THEN** it lists `dotclaude`, `dotclaude-jev`, `dotclaude-browser`, `dotclaude-docs`, and `dotclaude-codegraph`, and no `dotclaude-modder`

#### Scenario: Add-on alone

- **WHEN** an add-on loads with `dotclaude` not installed
- **THEN** `claude plugin validate` passes and its hooks and tools run
