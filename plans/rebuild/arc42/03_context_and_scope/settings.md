# Settings

## Settings and Switches

## Settings and Switches

## Settings and Switches

## Settings and Switches

## Settings and Switches

- [x] **CTX-014** sandbox.failIfUnavailable defaults to false (section 7 of the settings review). With it on, a platform without the sandbox cannot start Claude Code, which is against the user's rule, so the sandbox block shall not set it.
  Basis: measured; the rule is from the spec.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:693,1012; openspec/changes/archive/2026-11-09-release-2-1-319/specs/sandbox/spec.md:49; openspec/changes/archive/2026-11-10-release-2-1-319-1/specs/sandbox/spec.md:61.
  Verified: binary string search, claude 2.1.327, 2026-11-19: sandbox.failIfUnavailable exists and refuses to start without a working sandbox, so leaving it off stays correct.

## Settings and Switches

## Settings and Switches

- [x] **CTX-021** claudetto shall treat these as reported: `/goal` 4000-character condition limit, stop hook with fresh verifier (`/goal` 2.1.327: present; limit verified: the handler rejects a condition longer than 4000 characters with "Goal condition is limited to 4000 characters", chunk-qwykd6a6.js@1130 and chunk-v2rqpwd4.js@6685 (2.1.327); the fresh-verifier stop hook is reported); `/loop` creates a cron (CronCreate) regardless; `/loop` with Monitor beats short polling; Remote Control needs `/rc` or `claude rc` per session (2.1.327: flag `--remote-control` present; `/rc` present as alias of `/remote-control`, chunk-m14bt1pz.js:2525877); auto-mode classifier reportedly sends the whole transcript per bash call to Haiku (reported; not checkable locally because the auto-mode check runs on the server: a fake-API probe, 2026-11-18, made no classifier request and printed "Its safety check runs on the server"); Haiku reportedly dispatched for many spawned agents by default (corrected: the built-in Explore agent has `model:"inherit"`, capped at opus, chunk-m14bt1pz.js@242090 (2.1.327)); feedback prompts mostly after bad sessions, answering consents to training (reported; not checkable locally because it concerns server-side data policy); experiment id saved in session logs (reported; not checkable locally because the fake-API init reports `analytics_disabled:true` and assignments come from the server; the GrowthBook client holds `experimentId` per feature, chunk-asj6f58y.js@765365 (2.1.327)); Claude Code reading between sessions (truncated; reported); desktop auto-handoff button (reported; not checkable locally because it is a desktop app feature, not the CLI); `claude -p` flags `--max-turns` (present), `--max-budget-usd` (present), shell `timeout` wrapper; MCP Tasks and `/tasks`; API first official version drops `temperature` (cited); skill authoring guide (gerund names, one-level references, third-person description, progressive disclosure; cited secondhand); skill-creator `evals.json` vs `claude plugin eval` case folders (reported; the `claude plugin eval [target]` and `plugin eval init [name]` subcommands are present, chunk-j2hryht5.js@35035 and @39372 (2.1.327); `evals.json` was not found by string search); image billing by 28x28 patches (reported; the binary shows no patch formula, only per-model `image_limits` of 2576 px and 4784 tokens, chunk-f892tj2r.js@4532 (2.1.327); billing is server-side); cleanup: Claude Code leaves large artefacts (~1 TB tests/builds, 45 GB logs, 1.2M files across worktrees; reported); `cleanupPeriodDays` present (default 30, min 1).
  Acceptance: Reported items stay reported until re-queried. Verification: probe.
  Basis: reported. Status: unchecked: a fact about Claude Code, not code at 088a227c.
  Source: external/export-Goal and Loop - kinda the same-.jsonl:22 (url: <https://www.reddit.com/r/ClaudeCode/comments/1uaxlt6/goal_and_loop_kinda_the_same/>); external/2026-10-03/export-Any recommendations to reduce the token usage for simple tasks in a large project-.jsonl:11 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wwl9a4/any_recommendations_to_reduce_the_token_usage_for/>).
  Verified: binary string search, claude 2.1.327, 2026-11-19: the "Goal condition is limited to" handler is present; the fresh-verifier stop hook stays reported.

