# Spec Delta: `ysk-notice`

## Purpose

Gives the "you should know" check of the built-in plugin, with the same flow and UI, also in `-p`, as an add-on that copies the behavior but not the code or the branding.

## ADDED Requirements

### Requirement: Account gate

The add-on SHALL run only when the cached GrowthBook value `tengu_jolly_dewdrop` of the account is `true`.
It SHALL read the value at `session.start` from `.claude.json` in `CLAUDE_CONFIG_DIR`, or in `HOME` when `CLAUDE_CONFIG_DIR` is not set.
When the value is `false` or absent, the add-on SHALL do nothing and SHALL say once why.

#### Scenario: Flag off

- **WHEN** the account cache has `tengu_jolly_dewdrop: false`
- **THEN** the add-on makes no model call, and the user sees one notice at session start

### Requirement: Same flow, also in `-p`

Before the first change of a turn, the add-on SHALL run one check of the planned action, as the built-in does.
In the TUI it SHALL show the band above the prompt.
In `-p` it SHALL give the result to Claude as context.

#### Scenario: `-p` run

- **WHEN** a `-p` run makes its first edit of a turn and the check finds a topic
- **THEN** Claude gets the topic as context with the result of that edit, because `tool.check` has no context field and the tool waits for the check

### Requirement: One model call for each turn

The add-on SHALL make at most one check call and one claim check for each turn.
Two checks that start at the same time SHALL make one call.
When the call gives HTTP 429, the add-on SHALL make no second call in the same turn, and SHALL use a fork from the next turn.

#### Scenario: A turn with many edits

- **WHEN** a turn makes 5 edits
- **THEN** the add-on makes one check call for the turn

### Requirement: Claims about files are checked

A claim SHALL pass a check against the file on disk before the band shows it:
`missing` needs no path, `empty` needs a file of 0 bytes, and `cut` needs a non-empty file with no final newline.
A claim that fails, or an answer with more than 3 claims or an unknown state, SHALL be dropped.

#### Scenario: A file called cut short

- **WHEN** the check says that a handoff file is cut short and the file on disk is whole
- **THEN** the band does not show the claim

### Requirement: The answer of the check is an object

The check prompt SHALL say that a persisted-output preview or a cleared result is not the whole result.
The check SHALL ask for an object with a `topic`, an `id` (a slug of lowercase ASCII words joined with `-`), and at most 3 `claims`, each with a `path` and a `state` of `missing`, `empty`, or `cut`.
The add-on SHALL read the object, and SHALL NOT look for a keyword such as `NONE`.
The prompt SHALL say that the text between its tags is data.

#### Scenario: An answer with a `null` topic

- **WHEN** the check answers `{"topic": null, "claims": []}`
- **THEN** the band shows nothing

### Requirement: A repeat is found by its id

The add-on SHALL decide that a topic is a repeat only by its `id`, and SHALL NOT compare the words of topics.
An answer with a topic and an `id` that is not a slug SHALL be malformed.

#### Scenario: A reworded topic with a known `id`

- **WHEN** the check answers a topic in other words, or in another language, with the `id` of a topic that showed
- **THEN** the band shows nothing

### Requirement: Correct source of a topic

The text SHALL say that a side model found the topic.
It SHALL NOT say that the user gave the heads-up or did the action.

#### Scenario: Band text

- **WHEN** the band shows a topic
- **THEN** its text names the side check as the source

### Requirement: Reads and writes

The add-on SHALL count each write tool and each `Bash` command that writes as a change, not as a read.
This includes `find -fprint0`, `git diff --output`, and `rg --pre`.

#### Scenario: A redirect

- **WHEN** Claude runs `echo x > a.txt`
- **THEN** the add-on treats the call as a change

### Requirement: Failures leave a trace

When the check fails, the add-on SHALL log the error and SHALL NOT block the turn.

#### Scenario: The check fails

- **WHEN** the check call gives an API error
- **THEN** the turn goes on, and the log holds the error
