# Spec Delta: `status-line`

## Purpose

Shows the state of the session in the status line and the subagent status line, with values that agree with what Claude Code computes.

## ADDED Requirements

### Requirement: Context against the model window

The context segment SHALL show the `used_percentage` and the window that Claude Code gives in the status line input.
It SHALL NOT divide by a fixed window.

#### Scenario: A 1M window

- **WHEN** the input has `context_window_size` 1000000 and `used_percentage` 12
- **THEN** the segment shows 12 percent of 1M

### Requirement: Handover distance

The status line SHALL show how far the context is from the handover trigger, or from the compaction threshold when the compaction profile is on.

#### Scenario: Near the trigger

- **WHEN** the context is within 10 percent of the trigger
- **THEN** the segment uses the warning color

### Requirement: Inputs of 2.1.300

The status line SHALL show the rate limits, the effort, and the cost from the input when they are present, and SHALL omit each segment whose field is absent.

#### Scenario: No rate limits

- **WHEN** the input has no `rate_limits` field
- **THEN** the status line has no rate-limit segment, and no error shows

### Requirement: Colors with a meaning

Each color SHALL map to one state: normal, warning, or limit.
The same state SHALL have the same color in each segment.

#### Scenario: Two segments at the limit

- **WHEN** the context and the weekly rate limit are both at the limit
- **THEN** both segments use the same limit color

### Requirement: Colors of the built-in theme

The status line SHALL take its colors from the built-in theme that the `theme` key of the Claude Code config names.
The map SHALL be:

- the branch: the `merged` color of the theme, which is `rgb(135,0,255)` in the light themes and `rgb(175,135,255)` in the dark themes
- the model: the `claude` color, `rgb(215,119,87)`

#### Scenario: Dark theme

- **WHEN** the `theme` key is `dark`
- **THEN** the branch segment uses `rgb(175,135,255)`

### Requirement: State colors of the theme

Normal, warning, and limit SHALL use the `success`, `warning`, and `error` colors of the theme.
A cold prompt cache and the labels SHALL use the `inactive` color.
The PR segment SHALL use the color of its review state.

#### Scenario: Weekly use at the limit

- **WHEN** the weekly rate limit is at the limit
- **THEN** the rate-limit segment uses the `error` color of the theme

### Requirement: ANSI, daltonized, and no-color themes

In an `*-ansi` theme, the status line SHALL use the 16 ANSI colors, with ANSI 35 (magenta) for the branch, as in dotclaude 0.28.0.
In a `*-daltonized` theme, it SHALL use the values of that theme.
When `NO_COLOR` is set, it SHALL use no color.

#### Scenario: ANSI theme

- **WHEN** the `theme` key is `dark-ansi`
- **THEN** the branch segment uses ANSI 35

### Requirement: Prompt cache state

The status line SHALL show whether the prompt cache is warm or cold from `prompt_cache.warm`, and SHALL count down to `prompt_cache.expires_at` while it is warm.
The profile SHALL set `statusLine.refreshInterval`, so the countdown moves between turns.
The status line SHALL NOT show reset credits, because the status line input does not give them, and the account usage API needs the login token.

#### Scenario: The cache goes cold

- **WHEN** `prompt_cache.warm` is `false`
- **THEN** the cache segment shows cold in the `inactive` color, with `recache_tokens_if_cold` when it is present

### Requirement: Errors are not read as absent data

A failed `git` call SHALL show as an error state, not as "no repository".

#### Scenario: `git` fails

- **WHEN** `git` exits with an error in a repository
- **THEN** the branch segment shows an error mark, not an empty value

### Requirement: Subagent status line

The subagent status line SHALL show the agent type, the model, and the context of the subagent.

#### Scenario: A running subagent

- **WHEN** a subagent runs
- **THEN** its row shows its type, its model, and its context percentage
