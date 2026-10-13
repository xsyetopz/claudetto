# Setup settings

## ADDED

### Requirement: Atomic settings write

`dotclaude-setup settings --apply` SHALL write the user settings file with `writeAtomic`, and SHALL keep a symlink and the mode of the file.

#### Scenario: Interrupted write

- **WHEN** the process stops during the write of `settings.json`
- **THEN** the file holds the old content or the new content, never a part of either

#### Scenario: Symlinked settings file

- **WHEN** `settings.json` is a symlink to a file in another folder
- **THEN** the symlink stays, and the file that it names gets the new content with its old mode
