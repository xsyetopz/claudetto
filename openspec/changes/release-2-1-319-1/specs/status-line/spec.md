## MODIFIED Requirements

### Requirement: Stdin Only

The status line command SHALL build its output from its stdin JSON and from bounded reads of local files in the project folder. It SHALL make no network call, no model call, and start no child process. The only files it reads are those that the requirements "Branch of a Plain Checkout", "Open OpenSpec Changes", and "Context Is Measured Against the Window in Force" name. Each read SHALL be capped in bytes, and a missing or unreadable file SHALL leave its part out.

#### Scenario: Normal Input

- **WHEN** the command gets a `2.1.316` status line JSON on stdin
- **THEN** it prints its lines and exits 0, and a test shows no network or process call and no file read outside the named files

#### Scenario: Unreadable File

- **WHEN** `.git/HEAD` or a `tasks.md` cannot be read
- **THEN** that part is left out, the rest prints, and the exit code is 0

## ADDED Requirements

### Requirement: Context Is Measured Against the Window in Force

The context part SHALL show the input tokens as a percent of the window that compaction runs against, not of the model's window. The claudetto mod SHALL write that window after each response to a session file under `.claude/claudetto/`, and the line SHALL read it.

#### Scenario: Where the Window Comes From

- **WHEN** the mod writes the session file
- **THEN** it takes `context.breakdown.rawMaxTokens` from `$.session.usage({ breakdown: "summary" })` (`index.d.ts:11773-11801`), because stdin `context_window_size` is the model's window and `used_percentage` is measured against it (`Mut` in `chunk-24jdhyyr.js`, 2.1.319)

#### Scenario: A 300k Compaction Window on a 1M Model

- **WHEN** the model's window is 1,000,000, `autoCompactWindow` is 300000, and the last response read 100,000 input tokens
- **THEN** the part reads `ctx 33% of 300k`, where today it reads `ctx 10% of 1M`

#### Scenario: A Window Changed in the Session

- **WHEN** `/autocompact` or a per-model `autoCompactWindow` sets another window
- **THEN** the part shows that window after the next response

#### Scenario: No Window File

- **WHEN** the file is absent or unreadable, such as before the first response
- **THEN** the part falls back to stdin `used_percentage` and `context_window_size`, as today

#### Scenario: The Call Is Free

- **WHEN** the mod reads the window
- **THEN** it sends no token-count or model request, because `summary` "estimates locally and sends none" (`index.d.ts:12709-12710`)

### Requirement: Colours Follow the Claude Code Theme

The line SHALL paint each part with the colour of the active Claude Code theme's role for it: `success`, `warning`, `error`, `inactive`, `claude` for the model, and `merged` for the branch. The mod SHALL write the `theme` setting's name into the same session file, and the line SHALL map it to a palette copied from the engine's built-in tables.

#### Scenario: No Theme on Stdin

- **WHEN** the line looks for the theme
- **THEN** it reads the session file, because the 2.1.319 status line JSON has no theme key (`chunk-24jdhyyr.js`) and `$.config.list()` returns the `theme` row (`index.d.ts:3272`)

#### Scenario: A Light Theme

- **WHEN** the theme is `light`
- **THEN** the line paints `success` `rgb(44,122,57)`, `error` `rgb(171,43,63)`, `warning` `rgb(150,108,30)`, and `inactive` `rgb(102,102,102)`, where today it paints the dark values on every theme (`statusline/color.ts:11-13, 49`)

#### Scenario: An ANSI Theme

- **WHEN** the theme is `light-ansi` or `dark-ansi`
- **THEN** the line paints with basic SGR colours (`32`, `33`, `31`), not RGB

#### Scenario: An Unknown Theme

- **WHEN** the theme is `auto`, a `custom:` name, or the file is absent
- **THEN** the line uses the `dark` palette, as the engine does for an unknown name (`RK` in `chunk-w5ysqthb.js`)

#### Scenario: The Copied Palette Is Checked

- **WHEN** the engine version changes
- **THEN** a test compares the copied palette with the engine's tables and fails on a difference

### Requirement: Items Flow into Rows

The line SHALL lay its items out in one sequence, in the order place, session, limits, cache, joined by ` · `, and SHALL start a new row only when the next item does not fit the terminal width, up to 4 rows. It SHALL NOT tie an item to a fixed row.

#### Scenario: A Wide Terminal

- **WHEN** every item fits in 2 rows of the width
- **THEN** the line prints 2 rows, the second continuing where the first ended, such as `◫ ctx 33% of 300k · +719 −21 · ◷ 7d 1% ⇣4% ↻Nov 16 at 6am · ⌁ 59m/1h 97%`

#### Scenario: A Narrow Terminal

- **WHEN** the items with clock times do not fit in 4 rows
- **THEN** the line uses countdowns, and an item that still does not fit in the fourth row is cut at the width

#### Scenario: An Item Wider Than a Row

- **WHEN** one item alone is wider than the terminal
- **THEN** it takes its own row, cut at the width
