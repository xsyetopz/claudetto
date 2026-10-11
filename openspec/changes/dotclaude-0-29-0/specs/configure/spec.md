## ADDED Requirements

### Requirement: Scopes of configure

`configure` SHALL set up three scopes after install: the global `~/.claude`, the repository `.claude`, and the outside tools that the add-on plugins need (design D13).
The user SHALL pick the scopes and the items in the picker.

#### Scenario: Repository only

- **WHEN** the user picks only the repository scope
- **THEN** `configure` changes no file outside the repository `.claude`

### Requirement: Bun check

`configure` SHALL run `bun --version` before it computes a diff, because each dotclaude script runs on Bun 1.4.3 or later (design D11).
The `configure` script SHALL compare the version with `Bun.semver.satisfies` and find outside tools with `Bun.which` (design D28).
When Bun is missing or older than 1.4.3, `configure` SHALL show the install command of Bun and SHALL write no file.

#### Scenario: No Bun

- **WHEN** `bun --version` fails
- **THEN** `configure` shows the install command of Bun, and no file changes

#### Scenario: Old Bun

- **WHEN** `bun --version` prints `1.4.2`
- **THEN** `configure` shows the install command of Bun, and no file changes

### Requirement: Confirmed writes

`configure` SHALL show the diff of each file before it writes the file, and SHALL write only the files whose diff the user confirms.
It SHALL keep the keys of the user that dotclaude does not set.

#### Scenario: Rejected diff

- **WHEN** the user rejects the diff of `~/.claude/settings.json`
- **THEN** the file is unchanged

#### Scenario: User key kept

- **WHEN** `~/.claude/settings.json` has a key that dotclaude does not set
- **THEN** the key and its value are the same after `configure` writes the file

### Requirement: Merge by key

`configure` SHALL merge each settings file by key, and SHALL keep each value of the user in a key that dotclaude does not own.
In a list or object key that dotclaude and the user share, such as `availableModels` or `statusLine`, it SHALL keep the items of the user, and the diff SHALL show each changed value of the user.

#### Scenario: Extra model

- **WHEN** `availableModels` of the user holds a model that the snippet does not list
- **THEN** the model is in `availableModels` after the write

#### Scenario: Status line field

- **WHEN** `statusLine` of the user has a `padding` field
- **THEN** the field is in `statusLine` after the write

### Requirement: Paths that last

The status line command and each other path that `configure` writes SHALL stay valid after a plugin update (design D13).
`configure` SHALL NOT write a path of one machine into a project file that git tracks.

#### Scenario: Plugin update

- **WHEN** the plugin updates to a new version after `configure` ran
- **THEN** the status line runs with no new `configure` run

#### Scenario: Project scope

- **WHEN** `configure` writes the repository `.claude/settings.json`
- **THEN** the file holds no absolute path of the home folder

### Requirement: Choices asked

`configure` SHALL ask the user for each model and account choice, such as `claude-mythos-5-1` in place of `claude-fable-5-1`, and SHALL give the evidence with the question.

#### Scenario: Mythos in the catalog

- **WHEN** the model catalog of the account offers `claude-mythos-5-1`
- **THEN** `configure` asks the user before it writes the model, and writes `claude-fable-5-1` if the user declines

### Requirement: Picker

The picker of `configure` SHALL show each item with its token cost and what turning it off loses (design D14).
Each item SHALL accept an optional note through the `n` key.
The picker SHALL return an explicit empty list when the user ticks no item.
The picker SHALL be a mod tool if the probe of design D14 passes, else a mod pane.

#### Scenario: Nothing ticked

- **WHEN** the user ticks no item and confirms
- **THEN** the picker returns an empty list, and `configure` writes no change for that list

#### Scenario: Note

- **WHEN** the user presses `n` on an item and types a note
- **THEN** the result holds the note with the item
