## ADDED Requirements

### Requirement: Setup Writes the Status Line

Setup SHALL write `statusLine` as a command at the plugin root with `refreshInterval` 5, and keep a value the user set whole. Neither setup nor the plugin's root `settings.json` SHALL write `subagentStatusLine`, because Claude Code 2.1.323 ignores it.

#### Scenario: User Line Kept

- **WHEN** `statusLine` is already set to another command
- **THEN** setup keeps it and the report says so

#### Scenario: No Subagent Line

- **WHEN** the plugin is enabled and setup has run
- **THEN** no settings file that claudetto writes or ships holds `subagentStatusLine`

## MODIFIED Requirements

### Requirement: Colours Follow the Claude Code Theme

The line SHALL paint each part with the colour of the active Claude Code theme's role for it: `success`, `warning`, `error`, `inactive`, `claude` for the model, and `merged` for the branch. The mod SHALL write the `theme` setting's name into the same session file, and the line SHALL map it to a palette copied from the engine's built-in tables. Until the session file names a theme, the line SHALL paint with the `dark` palette, unless `NO_COLOR` is set.

#### Scenario: No Theme on Stdin

- **WHEN** the line looks for the theme
- **THEN** it reads the session file, because the 2.1.319 status line JSON has no theme key (`chunk-24jdhyyr.js`) and `$.config.list()` returns the `theme` row (`index.d.ts:3272`)

#### Scenario: A Light Theme

- **WHEN** the theme is `light`
- **THEN** the line paints `success` `rgb(44,122,57)`, `error` `rgb(171,43,63)`, `warning` `rgb(150,108,30)`, and `inactive` `rgb(102,102,102)`

#### Scenario: A Daltonized Theme

- **WHEN** the theme is `light-daltonized` or `dark-daltonized`
- **THEN** `success`, `error`, `warning` are `rgb(0,102,153)`, `rgb(204,0,0)`, `rgb(255,153,0)` on light and `rgb(51,153,255)`, `rgb(255,102,102)`, `rgb(255,204,0)` on dark (`chunk-w5ysqthb.js` offsets 14298 and 19252, 2.1.319)

#### Scenario: An ANSI Theme

- **WHEN** the theme is `light-ansi` or `dark-ansi`
- **THEN** the line paints with the engine's ANSI names as SGR codes: green, red, yellow, magenta (`32`, `31`, `33`, `35`) and `inactive` bright black (`90`) on light; the bright forms (`92`, `91`, `93`, `95`) and `inactive` white (`37`) on dark (offsets 9447-11896)

#### Scenario: The Table for Each Name

- **WHEN** the line picks a palette
- **THEN** it maps the name as the engine's `RK` does (`chunk-w5ysqthb.js` offset 21034): `light`, `light-ansi`, `dark-ansi`, `light-daltonized`, `dark-daltonized` to their tables, and any other name to `dark`

#### Scenario: No Theme File

- **WHEN** the session file is absent, or it names no theme, such as before the first measured turn
- **THEN** the line paints with the `dark` palette

#### Scenario: No Colour Asked For

- **WHEN** `NO_COLOR` is set
- **THEN** the line paints with no colour, whether or not the session file names a theme

#### Scenario: The Copied Palette Is Checked

- **WHEN** the engine version changes
- **THEN** a test compares the copied palette with the engine's tables and fails on a difference

## REMOVED Requirements

### Requirement: Setup Writes Both Lines

**Reason**: Claude Code 2.1.323 ignores `subagentStatusLine`, so the plugin's `settings.json` stops shipping it.

**Migration**: "Setup Writes the Status Line" writes `statusLine` alone, and Claude Code draws its default subagent rows.

### Requirement: Subagent Rows

**Reason**: Claude Code 2.1.323 made `subagentStatusLine` a no-op ("Deprecated: no longer has any effect. Subagent rows always use the default look."), so `statusline/subagents.ts` renders nothing the person sees and is deleted.

**Migration**: Claude Code's default subagent rows. The `subagentStatusLine` key is removed from the plugin's `settings.json`.

### Requirement: A Subagent Row Is Fitted to the Columns

**Reason**: `statusline/subagents.ts` is deleted, because `subagentStatusLine` is a no-op on 2.1.323.

**Migration**: Claude Code's default subagent rows.

### Requirement: A Subagent Row Names the Task and Its Context

**Reason**: `statusline/subagents.ts` is deleted, because `subagentStatusLine` is a no-op on 2.1.323.

**Migration**: Claude Code's default subagent rows.

### Requirement: A Subagent Row Shows the Time or the State

**Reason**: `statusline/subagents.ts` is deleted, because `subagentStatusLine` is a no-op on 2.1.323.

**Migration**: Claude Code's default subagent rows.
