# Spec Delta

## Purpose

Defines the `dotclaude-codegraph` add-on (design D26).
It gives Claude the code graph of a project through the CodeGraph CLI, with command hooks that put the graph in front of the model at the point of a search, and with no MCP server.

## ADDED Requirements

### Requirement: Add-on plugin

The code graph SHALL be the plugin `dotclaude-codegraph`, with a `bin/` folder and classic command hooks and with no hooks module.
It SHALL work without `dotclaude` and SHALL NOT import from it.
When it is not installed, no code-graph text SHALL be in the request.

#### Scenario: Add-on not installed

- **WHEN** `dotclaude-codegraph` is not installed
- **THEN** the request has no code-graph line, and `dotclaude` works as before

### Requirement: Opt-in for each project

The code-graph hooks SHALL run only in a project that has a `.codegraph/` folder.

#### Scenario: Project without an index

- **WHEN** a session starts in a project with no `.codegraph/` folder
- **THEN** no code-graph hook runs a command or adds context

### Requirement: CLI only

The add-on SHALL call the `codegraph` CLI and SHALL NOT add an MCP server for it.
Its install check SHALL NOT run `codegraph install`, and SHALL NOT install the CLI without the user.

#### Scenario: CLI missing

- **WHEN** the add-on check runs and `codegraph` is not on `PATH`
- **THEN** it prints the install command and changes nothing for the code graph

### Requirement: Session start

At session start in an indexed project, a hook SHALL sync the index and SHALL add one line that names the `callers`, `callees`, and `impact` commands.

#### Scenario: Indexed project

- **WHEN** a session starts in a project with `.codegraph/`
- **THEN** the index syncs, and the start context has one code-graph line

### Requirement: Graph context at a search

Before a `Grep` or `Glob` call in an indexed project, a hook SHALL add the graph result for the searched symbol, bounded by `GRAPH_CONTEXT_MAX`.
When the graph has no result, or the CLI does not answer in time, the hook SHALL add nothing and SHALL NOT block the call.

#### Scenario: Known symbol

- **WHEN** the model greps for a function name that the graph knows
- **THEN** the call runs, and the model also gets the definition and the callers of the symbol within the bound

#### Scenario: No answer

- **WHEN** the CLI fails or times out
- **THEN** the call runs with no added context

### Requirement: Fresh index

After an edit, a write, or a git command that changes the tree, a hook SHALL sync the index without delaying the session.

#### Scenario: Edit

- **WHEN** the model edits a source file in an indexed project
- **THEN** the next graph result reflects the edit

### Requirement: Measured effect

The eval SHALL compare an impact question with and without the code-graph hooks, for correctness and tokens.

#### Scenario: Eval report

- **WHEN** the eval suite runs the code-graph case
- **THEN** the report gives both arms with the resolve rate and the input tokens

### Requirement: No own data

The add-on SHALL NOT write a file of its own, such as a refresh record in `${CLAUDE_PLUGIN_DATA}` (design D26, D35).
The only index is the one that the CodeGraph CLI keeps in `.codegraph/`.

#### Scenario: Plugin data folder

- **WHEN** a test searches `plugins/dotclaude-codegraph/` for `CLAUDE_PLUGIN_DATA`
- **THEN** it finds none
