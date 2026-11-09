# status-line Specification

## Purpose
A status line and a subagent status line that read only the stdin JSON of Claude Code `2.1.314`.

## Requirements

### Requirement: Stdin Only

The status line command SHALL build its output from its stdin JSON and from bounded reads of local files in the project folder. It SHALL make no network call, no model call, and start no child process. The only files it reads are those that the requirements "Branch of a Plain Checkout" and "Open OpenSpec Changes" name. Each read SHALL be capped in bytes, and a missing or unreadable file SHALL leave its part out.

#### Scenario: Normal Input

- **WHEN** the command gets a `2.1.316` status line JSON on stdin
- **THEN** it prints its lines and exits 0, and a test shows no network or process call and no file read outside the named files

#### Scenario: Unreadable File

- **WHEN** `.git/HEAD` or a `tasks.md` cannot be read
- **THEN** that part is left out, the rest prints, and the exit code is 0

### Requirement: Fixed Defects of the Old Line

The rebuilt line SHALL NOT show defects D1 to D4 and D7 of the status-line defect report of 2026-10, kept outside this repo. Each has a test with the input that showed it.

#### Scenario: Old Defect Input

- **WHEN** the command gets the input of one listed defect
- **THEN** its output is the fixed one

### Requirement: Bad Input Does Not Break the Line

A missing field or input that is not JSON SHALL print a short line and exit 0, never a stack trace.

#### Scenario: Missing Field

- **WHEN** a field the line uses is absent
- **THEN** that part is left out and the rest prints

### Requirement: Setup Writes Both Lines

Setup SHALL write `statusLine` as a command at the plugin root with `refreshInterval` 5, and keep a value the user set whole. `subagentStatusLine` SHALL ship in the plugin's root `settings.json`, and setup SHALL NOT write it.

#### Scenario: User Line Kept

- **WHEN** `statusLine` is already set to another command
- **THEN** setup keeps it and the report says so

#### Scenario: Subagent Line from the Plugin

- **WHEN** the plugin is enabled
- **THEN** `subagentStatusLine` comes from the plugin's root `settings.json` and no setup step writes it

### Requirement: `/statusline` Is Answered Without a Model Call

The built-in `/statusline` with no arguments SHALL write claudetto's `statusLine` to the user settings file and print a report of what it wrote. It SHALL make no model call and add nothing to the context. A line the user already set SHALL be kept, and the report SHALL say it was kept.

#### Scenario: No Line Set

- **WHEN** the user runs `/statusline` and the settings file has no `statusLine`
- **THEN** the key is written with claudetto's command, the report names the file, and no model request is sent

#### Scenario: User Line Kept

- **WHEN** the user runs `/statusline` and the settings file has a `statusLine` that is not claudetto's
- **THEN** that value is unchanged, and the report says it was kept

#### Scenario: Unreadable Settings

- **WHEN** the settings file is not a JSON object
- **THEN** nothing is written, and the report names the file to fix

### Requirement: Branch of a Plain Checkout

The status line SHALL show the current branch in a plain checkout, not only in a worktree session. When stdin carries `worktree.branch`, that value is shown. Otherwise the branch is read from the `HEAD` file of the repository that holds the project folder, following a `.git` file's `gitdir:` line for a linked worktree or a submodule. A detached `HEAD` SHALL show its first 7 hex digits. A folder in no repository SHALL show no branch.

#### Scenario: Plain Checkout on Main

- **WHEN** the project folder is a plain checkout whose `.git/HEAD` reads `ref: refs/heads/main`, and stdin has no `worktree`
- **THEN** the first row shows the branch icon and `main`

#### Scenario: Linked Worktree

- **WHEN** the project folder's `.git` is a file with a `gitdir:` line
- **THEN** the branch is read from the `HEAD` of that folder

#### Scenario: Detached Head

- **WHEN** `HEAD` holds a commit hash
- **THEN** the branch part shows the first 7 hex digits of the hash

#### Scenario: Outside a Repository

- **WHEN** no `.git` exists in the project folder or its parents
- **THEN** no branch part is shown and the rest of the row prints

### Requirement: Open OpenSpec Changes

The status line SHALL show each open OpenSpec change of the project: a change folder under `openspec/changes/`, other than `archive`, whose `tasks.md` has at least one unticked box. Each change SHALL show its name and its ticked and total box counts, such as `release-0-3-0 4/12`. When more than two changes are open, the two most recently modified are shown and the rest are counted as `+N`. A change whose boxes are all ticked, or which has no `tasks.md`, SHALL NOT be shown.

#### Scenario: One Open Change

- **WHEN** `openspec/changes/release-0-3-0/tasks.md` has 12 boxes of which 4 are ticked
- **THEN** the line shows `release-0-3-0 4/12`

#### Scenario: Only Finished Changes

- **WHEN** every `tasks.md` under `openspec/changes/` has all boxes ticked
- **THEN** no OpenSpec part is shown

#### Scenario: Many Open Changes

- **WHEN** four changes are open
- **THEN** the line shows the two most recently modified and `+2`

#### Scenario: No OpenSpec Folder

- **WHEN** the project has no `openspec/changes/` folder
- **THEN** no OpenSpec part is shown and nothing else changes

### Requirement: Cache Countdown

The status line SHALL show the prompt cache of the main conversation from the `prompt_cache` object of its stdin: while `warm` is `true`, the time left until `expires_at` (Unix seconds), the `ttl`, and `hit_ratio` as a percent; while `warm` is `false`, `cold` and `recache_tokens_if_cold`. It SHALL show nothing when `prompt_cache` is absent, `warm` is not a boolean, or `caching_observed` is `false`, and the time left SHALL never be negative.

#### Scenario: Warm Cache

- **WHEN** stdin has `prompt_cache` with `warm` `true`, `ttl` `"5m"`, `expires_at` 252 seconds after now, and `hit_ratio` 0.91
- **THEN** the cache part reads `4m/5m 91%`

#### Scenario: Cold Cache

- **WHEN** stdin has `prompt_cache` with `warm` `false` and `recache_tokens_if_cold` 120000
- **THEN** the cache part reads `cold +120k`

#### Scenario: No Cache Data

- **WHEN** stdin has no `prompt_cache`, or `caching_observed` is `false`
- **THEN** no cache part is shown and the rest of the row prints

#### Scenario: Expired Between Refreshes

- **WHEN** `warm` is `true` but `expires_at` is already past
- **THEN** the time left reads `0s`, not a negative time

#### Scenario: Missing Expiry

- **WHEN** `warm` is `true` and `expires_at` is `null`
- **THEN** the cache part reads `warm`, with the `ttl` when stdin has one

### Requirement: Cache Miss Cause

The status line SHALL name the likely cause of the last cache miss when `prompt_cache.misses` is above 0 and `prompt_cache.last_miss_cause.causes` is a non-empty array of strings: the first cause, with `_` shown as a space, such as `tools changed`, after `miss: `. It SHALL show no cause part for an unknown cause shape, and SHALL cap the cause words at 24 characters.

#### Scenario: Tools Changed

- **WHEN** stdin has `prompt_cache.misses` 1 and `last_miss_cause.causes` `["tools_changed"]`
- **THEN** the cache part adds `miss: tools changed`

#### Scenario: No Miss

- **WHEN** `prompt_cache.misses` is 0
- **THEN** no cause part is shown

### Requirement: `/statusline` With Text Uses an Edit Text

`/statusline <text>` SHALL replace the built-in command's prompt, through `skill.prompt`, with claudetto's edit text, so the main model edits the setting under the stock grant. It SHALL NOT pass the call through to the built-in command, and it SHALL NOT answer with a denial text.

#### Scenario: Text Given

- **WHEN** the user runs `/statusline show the time`
- **THEN** the main model receives the edit text in place of the built-in prompt

#### Scenario: The Built-in Agent Is Withheld

- **WHEN** the built-in `statusline-setup` agent is withheld by `agent.offer`
- **THEN** `/statusline <text>` still works, and no answer names `Agent(statusline-setup)` in `permissions.deny`
