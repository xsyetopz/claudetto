# status-line Specification

## Purpose
The status line shows context and plan usage in a color gradient, and it saves the last plan limits for the eval recipes.

## Requirements

### Requirement: Usage Gradient

The status line SHALL color `context_window.used_percentage`, `rate_limits.five_hour.used_percentage`, and `rate_limits.seven_day.used_percentage` green below 40%, amber from 40% to 80%, and red above 80%.
It SHALL draw each label and the `resets_at` time next to each limit dim.
Setup SHALL write `statusLine.refreshInterval` `5`.

#### Scenario: Low Usage

- **WHEN** the context is at 25%
- **THEN** the value is green

#### Scenario: Middle Usage

- **WHEN** the plan usage is at 40%
- **THEN** the value is amber

#### Scenario: High Usage

- **WHEN** the context is at 81%
- **THEN** the value is red

#### Scenario: Labels

- **WHEN** the line draws the label "ctx"
- **THEN** the label is dim

### Requirement: No Theme Code

The status line SHALL have no theme code.

#### Scenario: Theme Option

- **WHEN** a user sets a theme option for the status line
- **THEN** the slice ignores it and uses the gradient

### Requirement: Rate Limits File

The status line SHALL write the last `rate_limits` it received to a file in the temp folder from `kernel/tmp.ts`.

#### Scenario: Input with Limits

- **WHEN** the status line gets input with `rate_limits`
- **THEN** the file in the temp folder holds those `rate_limits`

#### Scenario: Input with No Limits

- **WHEN** the input has no `rate_limits`
- **THEN** the file keeps its last content
