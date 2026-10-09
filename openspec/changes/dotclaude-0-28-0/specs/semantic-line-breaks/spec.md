# Spec Delta

## Purpose

Applies semantic line breaks to the text that Claude writes, with a silent formatter that costs no model tokens (design D29).
A chat reply has a prompt rule and an eval measure, and no rewrite and no log.

## ADDED Requirements

### Requirement: Sentence-split formatter

The core plugin SHALL have a formatter `sembr` in `lib/` that uses only `node:` modules or none.
The formatter SHALL break a line only after a sentence end (`.`, `!`, or `?`) that a space and a new sentence follow.
The formatter SHALL NOT join lines, so an existing break stays and a second run gives the same text.

#### Scenario: Two sentences on one line

- **WHEN** the formatter reads `Read the file. Then edit it.`
- **THEN** it gives two lines, one for each sentence

#### Scenario: Idempotence

- **WHEN** the formatter runs on its own output
- **THEN** the text does not change

### Requirement: Formatter protected text

The formatter SHALL NOT change code fences, inline code, link targets, URLs, tables, headings, front matter, link definitions, or a line that ends in a hard break.
The formatter SHALL NOT split after an abbreviation such as `e.g.`, `i.e.`, `etc.`, or `vs.`, a single capital letter, or a version number.
The formatter SHALL NOT change the rendered output.

#### Scenario: Protected text

- **WHEN** the input has a code fence, a table row, an abbreviation `e.g. this`, or a line that ends in two spaces
- **THEN** the formatter leaves each of them unchanged

### Requirement: Silent rewrite before a write

A `PreToolUse` hook SHALL rewrite the text of a `Write` and of an `Edit` to a `.md` or `.mdx` path through `updatedInput`.
For `Edit`, the hook SHALL change `new_string` only and SHALL keep `old_string` as it is.
The hook SHALL do nothing when the text needs no change.

#### Scenario: Write with fused sentences

- **WHEN** the model writes a `.md` file with two sentences on one line
- **THEN** the file on disk has one sentence on each line, and the hook output has no text for the model

#### Scenario: Edit

- **WHEN** the model edits a `.md` file and `new_string` has two sentences on one line
- **THEN** the hook changes only `new_string`

#### Scenario: Other file type

- **WHEN** the model writes a `.mjs` file
- **THEN** the hook changes nothing

### Requirement: Rewrite output

The hook SHALL print no `additionalContext` and no `systemMessage`, so that no token goes to the model.
The hook SHALL NOT set `permissionDecision`, so that the normal permission flow stays.

#### Scenario: Permission flow

- **WHEN** the hook rewrites a write or a `gh pr create` command
- **THEN** its output has no `permissionDecision`, and the write still prompts and `gh pr create` still asks before it publishes

### Requirement: Rewrite whole lines only

The hook SHALL rewrite a `new_string` only when it starts and ends at line bounds of the file, and SHALL NOT change table rows or inline-code spans.

#### Scenario: Fragment of a line

- **WHEN** `new_string` is a part of a line, or a table row
- **THEN** the hook leaves it unchanged

### Requirement: Commit and pull request text

A `PreToolUse` hook on `Bash` SHALL rewrite the message of `git commit` and the body of `gh pr create` only in the quoted heredoc form (`<<'EOF'`).
The hook SHALL NOT change the subject line, the title, or a trailer such as `Co-Authored-By:`.
For any other form (`-m "..."`, `-F`, `--body-file`, or an unquoted heredoc), the hook SHALL do nothing.
The hook SHALL NOT rewrite when any output line equals the heredoc delimiter.

#### Scenario: Quoted heredoc

- **WHEN** the command is `git commit -m "$(cat <<'EOF' ... EOF)"` and the body has two sentences on one line
- **THEN** the hook returns a command with one sentence on each line, and the subject and trailers are unchanged

#### Scenario: Delimiter line

- **WHEN** a split would make a line equal to `EOF`
- **THEN** the hook returns the command unchanged

#### Scenario: Other form

- **WHEN** the command uses `-F file`
- **THEN** the hook returns the command unchanged

### Requirement: No rewrite after a write

dotclaude SHALL NOT rewrite a file in a `PostToolUse` hook for line breaks, because the rewrite may make the next `Edit` fail with "File has been modified since read" (inferred from bundle text, not run, until probe 2.29).

#### Scenario: Hook list

- **WHEN** a test reads `hooks/hooks.json`
- **THEN** no `PostToolUse` hook runs `features/sembr/cli.mjs`

### Requirement: Chat prompt rule

The output style SHALL have a `<reply_format>` block that gives the reason, one wrong example, and one right example.
dotclaude SHALL NOT ship a `Stop` hook that counts chat lines, because the hook only wrote a log file (design D29, D35).
The eval MAY measure the share of chat lines with more than one sentence from the run trace.
A `session.append` rewrite of the chat reply SHALL NOT ship (task 18.11).

#### Scenario: Reply format block

- **WHEN** a test reads the output style
- **THEN** it has a `<reply_format>` block with the reason, one wrong example, and one right example

#### Scenario: No log

- **WHEN** a test searches `plugins/dotclaude/` for `sembr-chat`
- **THEN** it finds none

### Requirement: Probes first

The tasks SHALL run three probes before the hooks ship: a later `Edit` whose `old_string` comes from the unwrapped text after a rewrite, `updatedInput` in auto mode, and `session.append` with door `response` on the chat display.
A failed probe SHALL change the route in design D29 and SHALL NOT turn into a workaround.

#### Scenario: Probe fails

- **WHEN** an `Edit` with the unwrapped `old_string` fails after a rewrite
- **THEN** the design records the failure and the route changes before the hook ships
