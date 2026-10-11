# Spec Delta

## Purpose

Defines the `dotclaude-docs` add-on, which makes Claude use current library and API docs from the Context7 CLI instead of recalled facts that can be out of date, at a small context cost.

## ADDED Requirements

### Requirement: Docs skill in an add-on

The plugin `dotclaude-docs` SHALL give a model-invocable skill that tells Claude to get library and API docs with the `ctx7` CLI before it uses a library fact that it cannot check in the project.
The skill listing entry SHALL have 100 characters or fewer.

#### Scenario: Add-on not installed

- **WHEN** `dotclaude-docs` is not installed
- **THEN** the request has no docs skill line, and `dotclaude` works as before

#### Scenario: Library question

- **WHEN** the task needs the API of a library version that the project uses
- **THEN** Claude runs `ctx7 library` and then `ctx7 docs` with a focused query

### Requirement: Free tier first

The skill SHALL work with no key.
When `CONTEXT7_API_KEY` is set, the CLI SHALL use it.

#### Scenario: No key

- **WHEN** `CONTEXT7_API_KEY` is not set
- **THEN** the CLI runs on the free tier

### Requirement: Few calls

The skill SHALL tell Claude to make at most 3 `ctx7` calls for one question, and to keep each query on one concept.

#### Scenario: Call count

- **WHEN** Claude answers one library question
- **THEN** the trace has at most 3 `ctx7` calls

### Requirement: Honest failure

When `ctx7` fails or the quota is used up, Claude SHALL tell the user, and SHALL NOT use recalled facts as if they came from the docs.

#### Scenario: Quota error

- **WHEN** `ctx7` reports a quota error
- **THEN** Claude tells the user and names `CONTEXT7_API_KEY` as the way to a higher limit

### Requirement: No secrets in queries

The skill SHALL tell Claude to put no secret, token, or private code in a `ctx7` query, because the query goes to the Context7 service.

#### Scenario: Query content

- **WHEN** Claude makes a `ctx7` query
- **THEN** the query has only the library name and the topic

### Requirement: Pinned and quiet

The skill SHALL run a pinned `ctx7` version, and its command SHALL turn off telemetry with `CTX7_TELEMETRY_DISABLED=1`.
The wiki snippet SHALL name only the hosts that `ctx7` needs for the sandbox network list, for a user who installs the add-on.

#### Scenario: Version

- **WHEN** a test reads the skill
- **THEN** the `ctx7` command has an exact version
