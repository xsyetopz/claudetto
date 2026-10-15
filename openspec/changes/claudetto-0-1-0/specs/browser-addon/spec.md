# Spec Delta: `browser-addon`

## Purpose

Gives a browser guide skill and an opt-in `WebSearch` backend in a headless browser, with CloakBrowser for sites with bot detection.

## ADDED Requirements

### Requirement: Consent for CloakBrowser

The default backend SHALL NOT use CloakBrowser.
CloakBrowser SHALL run only when the user chooses it in a setting.

#### Scenario: Default install

- **WHEN** the add-on is installed with no backend setting
- **THEN** no search uses CloakBrowser

### Requirement: Permission check of `WebSearch`

A search through the backend SHALL pass the permission rules of `WebSearch`.
A deny rule of `WebSearch` SHALL stop the backend search.

#### Scenario: `WebSearch` denied

- **WHEN** the settings deny `WebSearch` and Claude calls it
- **THEN** the backend does not search

### Requirement: Narrow command grants

The skill SHALL grant only the `agent-browser` subcommands that the guide uses.

#### Scenario: A subcommand not in the guide

- **WHEN** Claude runs an `agent-browser` subcommand that the guide does not name
- **THEN** Claude Code asks for permission

### Requirement: Notice of a lost option

When the backend cannot apply a domain filter or the extended mode, the result SHALL say so.

#### Scenario: Domain filter

- **WHEN** a `WebSearch` call has `allowed_domains` and the backend cannot filter
- **THEN** the result says that the filter did not apply

### Requirement: The browser closes

The add-on SHALL close each browser session that it opens, and SHALL report a failed close.

#### Scenario: A failed close

- **WHEN** the close of a browser fails
- **THEN** the log holds the error, and the next search does not reuse the session
