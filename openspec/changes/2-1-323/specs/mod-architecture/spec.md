## ADDED Requirements

### Requirement: Three Files That Share a Prefix Become a Folder

Three or more source files in one folder whose names share a prefix SHALL become a folder named for the prefix, or merge into one file when together they do one job. Each load path that names a moved file, in `register.ts`, `bunfig.toml`, and `project.just`, SHALL follow the move.

#### Scenario: The Spec and Validate Files

- **WHEN** the trim is done
- **THEN** the `spec*` and `validate*` source files of `claudetto-openspec/hooks` sit under `spec/` and `validate/`, and `register.ts` loads them from there

#### Scenario: The Ignore Files

- **WHEN** the trim is done
- **THEN** `useSetup` holds one `ignore.ts` and no other `ignore*` source file

#### Scenario: The Texts Files

- **WHEN** three or more `texts*` files remain under `hooks/`
- **THEN** they sit under `texts/`; when only two remain, they stay where they are

#### Scenario: A Load Path After a Move

- **WHEN** a file named in `bunfig.toml` or `project.just` moves into a folder
- **THEN** the entry names the new path, and `just check` passes

## MODIFIED Requirements

### Requirement: The Owner Is Chosen by a Recorded Check

The owner of a feature MUST be the first in this order that a recorded check shows to keep its behavior: a settings key or built-in behavior, a classic hook, a skill, an output style, a rule file, a mod, removal. A setting or a classic hook comes first because it costs no mod code, keeps working under `--safe-mode`, and is checked by Claude Code itself. A text MUST ship only where a check shows it helps. The feature map MUST name the check, the Claude Code version it ran on, and its result.

#### Scenario: A Native Setting Covers a Hook

- **WHEN** a probe on the installed Claude Code shows that a setting gives the same observed result as a hook
- **THEN** the hook is removed and setup writes the setting

#### Scenario: A Job Only a Mod Can Do

- **WHEN** no settings key, classic hook, skill, output style, or rule file can do a job, such as hiding a slash command
- **THEN** the job stays a mod

#### Scenario: The Check Has Not Run

- **WHEN** a feature's deciding check has not run
- **THEN** its fate stays marked proposed and the release does not ship a change to it
