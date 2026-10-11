# Design parts 3

This file holds D34 and D35 of `design.md`.

## D34 Adherence by checks in code, with no new judge

Approved by the user 2026-10-09 (task 24.2), as the more token-saving route than a `Stop` `agent` hook or a judge on each write.
The cases are in `research/ignored-instructions.md`.

The check costs no model tokens when the work follows the rules.
A deny reason costs about 50 tokens, and only at a violation.
It adds no model call.

### Tier 1: command hooks for each rule that code can check

- `PreToolUse` on `Bash`: `ask` before `git stash`, `git checkout --`, and `git reset`, because they move or discard work that other sessions share (case S2).
- `PreToolUse` on `Edit` and `Write` of a test file or a limits file: `ask`, with the reason that a test or a limit changes only when the user asks (cases S1 and A4).
- `PreToolUse` on `.md` writes and commit text: deny a code item with no code span, and give the fixed form (cases F1 to F3).
  It goes next to `features/sembr`, which already fixes the sentence lines (cases F4 and F5).
- `PreToolUse` on `Edit` and `Write`: deny new text that says "decision of the user" when no prompt of the user in the session approves it (case A1).

### Tier 2: project rules in a file (removed by D35)

The first plan had the `setup` skill write the rules that code can check to a rules file in the project, and the tier 1 hooks enforce the file.
Rule D35 removes it.
The file is a made-up JSON format that Claude Code does not read, and nothing proves that it stays in step with `CLAUDE.md`.
The tier 1 hooks keep rules that hold in each project, and their rules are code.
A rule that only one `CLAUDE.md` holds goes under "Gap".

### Tier 3: the existing `Stop` prompt hook

The rules that code cannot check, over-claims and claims of an approval of the user, go into the `Stop` prompt hook that already runs.
The cost is a few hundred tokens of prompt text and no second call.
That hook sees only its input and not `CLAUDE.md`, so it checks only rules that hold in each project.
Before text goes into it, the per-turn token cost of the hook is measured from the background-model usage of an eval run.

### Gap

A rule that needs judgment and is only in one `CLAUDE.md` is not checked.
The adherence suite of task 24.3 (ported by task 25.12) measures the gap, and a judge is added later only if the gap is large.

## D35 No proprietary formats (rule of the user 2026-10-09)

dotclaude 0.28+ never uses or makes up a proprietary schema or format for itself.
dotclaude takes only what the latest vanilla Claude Code provides:
settings, env vars, key-values, hooks and the other documented extension points, the API, and possibly the Agent SDK.
dotclaude does not make up a band-aid that cannot be proven to work.
D1 cites this rule.

A format is proprietary when dotclaude defines it and no Claude Code surface reads or defines it.
The formats of Claude Code are allowed, also when only Claude Code defines them, such as the settings file and the model catalog cache.
The custom solutions of dotclaude are not allowed (decision of the user 2026-10-11).
Examples:

- A JSON file with dotclaude keys: a profile, a case file, a rules file, a baseline, a report.
- A state file that a hook or the status line reads back: samples, markers, offsets, caches, logs, records.
- A protocol between dotclaude parts: a diff, a backup, a rollback, a launcher stub, a hidden oracle with hashes and a canary.
- A text convention that a check enforces, such as the `Status <date>:` note.
- A made-up key in a file that another tool owns, such as `x-claude-code-version`.

The test of the rule: a feature that must write its own file so that a later call reads it back is not built.
A feature that works from its input is built.
The input is the hook stdin, the status line stdin, the transcript, or a file of Claude Code.

What stays, and why:

1. Formats that Claude Code owns: settings, env vars, hook input and output, manifests, and the frontmatter of agents, skills, and output styles.
   The suite format of `claude plugin eval` belongs here, but its capabilities are **unverified** (D9, task 25.1).
   OpenSpec files and `.env` stay, because their tools own them.
1. The schemas that the repository extracts from the bundle: `schemas/claude-code-settings.json` and `schemas/claude-code-managed-settings.json`, for 2.1.295 and later, and the tool `tools/schema.mjs`.
   They copy a Claude Code format and are not a dotclaude format.
   The extraction version goes in the standard JSON Schema `$comment` keyword at the root of each file, such as `Extracted from Claude Code 2.1.295`.
   It does not go in a made-up key, and it does not go in the file name, because the `$schema` link must stay the same (decision of the user 2026-10-08).
   The version in the path is the other option, and it is rejected, because each update would change every link and test pin.
   The 2.1.293 and 2.1.294 copies go, because they only served 0.27.0 profiles.
1. Reads of Claude Code data that no doc covers: `cachedUsageUtilization` in `.claude.json`, the `/context` table in the transcript, `prompt_snapshot`, and the transcript JSONL.
   The wiki documents each read with no user detail.
   A reader accepts the known shape and hides its segment on another shape, which is safe handling and not a format of ours.
   A read that needs its own state file goes under the test above and is cut.
1. Code constants (`lib/budget.mjs`, `features/<name>/limits.mjs`, `tools/limits.mjs`), prompt text and the XML-like tags in prompts, and OpenSpec files.

Wipe policy: task group 25 deletes each proprietary format of earlier work outright, with its tests.
There is no migration, no compatibility shim, no kept copy, and no reader for an old file.
Git history is the only record.
No code deletes a file of the user.
The CHANGELOG names what 0.28.0 no longer writes.

Not cut by this rule: the merge of the settings snippet into a settings file of the user.
The merge writes keys of the Claude Code settings format, and no dotclaude part reads a file of its own back.
Release 0.28.0 cut it in error, so the user got none of the snippet, and the fix of 2026-10-11 restores it in `setup` with the snippet in `lib/snippet.mjs`.

Cut by this rule: the burn-rate samples, the slow-read cache, the context breakdown state, the usage state file, the level markers, the handoff carry and stop records, the guard per-session state, the auto-fix feature, the `sembr-chat.jsonl` log, the codegraph refresh data, the setup profile file with its diff, backups, migration, and gated items, the Tier 2 rules file, the router table, the `handoff` skill, `tools/baseline.json`, and the eval harness.
Alternative: keep each as a documented dotclaude format.
Rejected by the user, because a format of our own cannot be proven to work against Claude Code updates.

## D36 Clean repository and universal tools (decisions of the user 2026-10-09)

Context: the audits of task 28.2 (`research/audit-*.md`) found 0 import-layer violations and 0 files over the bound.
They also found workarounds in the runtime code, tools that serve only this repository, and a repository with no CI gate for the labs.
The comment of `research/issue-38335.md` shows that the start of a session and the number of calls of a run are the two costs that a user can measure.

Decisions:

- The universal tools ship in two add-on plugins.
  `dotclaude-sessions` is for each user: the start of a session by source, and the usage of each run.
  `dotclaude-lab` is for plugin authors: the sandbox, the request capture, the settings schema, and the eval comparison.
  Each one runs on Node 22.18 with only `node:` modules, and imports nothing from another plugin.
  `tools/` keeps only the scripts of this repository: bump, release, sizes, and limits.
- The sandbox takes the token from `CLAUDE_CODE_OAUTH_TOKEN`.
  When the variable is not set, it reads the login of the user from the Keychain or `~/.claude/.credentials.json`, and gives it only to the child process.
- The `rm` guard parser, the unbounded-output deny, and the context handoff are removed.
  The sandbox, an `ask` rule, `bashOutputMaxChars`, and the profile with no compaction do the same work with documented means.
- The reads of undocumented data stay: the credits segment, the `/context` scrape, and the drift section ids.
  The docs give the source of each one and how it breaks at a release of Claude Code.
- The docs stay in `wiki/`, the source of the GitHub Wiki that `just wiki` publishes (decision of the user 2026-10-10, which replaces the move into `docs/`).
  They get the shape of the Claude Code docs.
  A pull request reviews each doc change, because `wiki/` is in this repository.
  The old release pages go to an archive folder, because the CHANGELOG has their content.
- The package manager is `nub` or `pnpm`, chosen from the facts in task 28.3, and the toolchain is pinned with a lockfile.
- CI runs `just check`.

Order: tests before each move (task 28.4), then the plugins, then the removals, then the docs.
