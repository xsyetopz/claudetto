## Purpose

The layout of the core plugin: capability modules, one file for each hooked event, the import rules, the owners of the session state, one parser for each fact, and the page that names them.

## ADDED Requirements

### Requirement: Capability Modules

The runtime code of `plugins/claudetto/` SHALL be in `modules/<name>/`, one folder for each capability: `shell`, `project`, `jev`, `session`, `work`, `gate`, `agents`, `statusline`, `setup`, and `spec`.
A module SHALL have no `index.ts` barrel, and a file SHALL import the file that defines a name (the user, 2026-10-26).
A module with a command SHALL also have `adapters/cli.ts` for `bin/`. A test MAY import any module file.
The import graph of the modules SHALL have no cycle.

#### Scenario: Barrel File

- **WHEN** a module holds an `index.ts` that re-exports the names of its files
- **THEN** `just check` fails and names the file

#### Scenario: Cycle

- **WHEN** `modules/gate/paths.ts` imports `modules/work/notes.ts` and `modules/work/notes.ts` imports `modules/gate/paths.ts`
- **THEN** `just check` fails and names both modules

#### Scenario: Defining File Import

- **WHEN** a file of `modules/gate/` imports a function from the `modules/work/` file that defines it
- **THEN** `just check` passes

### Requirement: Kernel Scope

`plugins/claudetto/kernel/` SHALL hold only the read of the plugin options, text helpers, the ports that tests replace, the hook types, and `kernel/node/` for the commands.
A file of the kernel SHALL import no module.
The plugin options SHALL be read by one kernel function, which the mod and each command call.

#### Scenario: Kernel Imports a Module

- **WHEN** a kernel file imports `modules/session/limits.ts`
- **THEN** `just check` fails and names the import

#### Scenario: One Options Read

- **WHEN** a search lists each function that reads the plugin options
- **THEN** it finds one function, in the kernel

### Requirement: One Register File

`plugins/claudetto/hooks/register.ts` SHALL hold each hook of the plugin as a literal `on("<event>", <handler name>)` call with a `// rule: <module>.<job>` comment above it, because the mod runtime accepts no other form.
It SHALL import only `adapters/*.ts` files of the modules and the kernel.

#### Scenario: Stop Order

- **WHEN** a reader opens `register.ts`
- **THEN** the `classic.Stop` rules of the plugin are next to each other, in the order in which they run

#### Scenario: Rule Outside the Register File

- **WHEN** a module calls `on(...)` on its own
- **THEN** `just check` fails and names the file

### Requirement: Rule Names Key the Hook Evals

Each rule of `register.ts` SHALL have a name that is unique in the plugin.
`plugins/claudetto/evals/hooks.json` SHALL key each hook eval by a rule name, and a test SHALL fail for an eval key with no rule and for a rule with no eval.

#### Scenario: Missing Eval

- **WHEN** `register.ts` adds the rule `gate.monitor-dedupe` and `evals/hooks.json` has no key `gate.monitor-dedupe`
- **THEN** `just check` fails and names the rule

#### Scenario: Stale Eval

- **WHEN** `evals/hooks.json` has a key that no rule of `register.ts` names
- **THEN** `just check` fails and names the key

### Requirement: State Owners

Each `$.state` value of the plugin SHALL have one owner module, whose `state.ts` lists its key and declares its type.
Each file that calls `$.state` SHALL keep a literal ref, because the mod runtime takes no imported ref, and its key SHALL be in the list of an owner.
`types/index.d.ts` SHALL import nothing, and a type test SHALL fail when a contract type and its owner type differ.

#### Scenario: Shape Drift

- **WHEN** the `session` module adds a field to the type of `usage` and `types/index.d.ts` keeps the old type
- **THEN** `just typecheck` fails and names `usage`

#### Scenario: Hidden Reader

- **WHEN** a module reads the state key `notice` that no `state.ts` lists
- **THEN** `just check` fails and names the file

### Requirement: One Parser for Each Fact

Each of these facts SHALL have one function in its owner module, and each caller in the mod and in the commands SHALL use it: the edits of the user, the `git status -z` parse, a running agent, the project root, the cost report, the Jev key, the temp folder, the task lines, and the open change.

#### Scenario: One Definition

- **WHEN** a search lists the functions that parse `git status -z` output in `plugins/claudetto/`
- **THEN** it finds one function

#### Scenario: Command and Mod Agree

- **WHEN** `claudetto-statusline` and the `session` module count the tasks of the same `tasks.md`
- **THEN** both give the same counts from the same function

### Requirement: Behavior Stays

Each requirement of `openspec/specs/` SHALL hold after the move, except a requirement that this change modifies or removes.
Each hook lab scenario of `plugins/claudetto/tests/` that tests a kept behavior SHALL pass with no change other than its imports and its eval keys.

#### Scenario: Lab Passes

- **WHEN** the move is done and `just lab` runs
- **THEN** each scenario passes

### Requirement: Architecture Page

`src/wiki/claudetto/Architecture.md` SHALL name each module with its job, each `$.state` value with its owner, and each kernel file.
A test SHALL fail for a named folder or file that does not exist.

#### Scenario: Stale Name

- **WHEN** the page names a module `styles` and `modules/styles/` does not exist
- **THEN** `just check` fails and names `styles`
