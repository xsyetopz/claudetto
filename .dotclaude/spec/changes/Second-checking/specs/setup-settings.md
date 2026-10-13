# Setup settings

## ADDED

### Requirement: Atomic settings write

`dotclaude-setup settings --apply` SHALL write the user settings file with `writeAtomic`.

#### Scenario: Interrupted write

- **WHEN** the process stops during the write of `settings.json`
- **THEN** the file holds the old content or the new content, never a part of either

### Requirement: No torn exclude line

The exclude step SHALL NOT leave a torn line in `.git/info/exclude` when two runs append at the same time.

#### Scenario: Two runs

- **WHEN** two `dotclaude-setup` runs add runtime paths to the same exclude file
- **THEN** every line of the file is a whole path
