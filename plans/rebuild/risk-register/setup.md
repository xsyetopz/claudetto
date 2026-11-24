# Setup Risks

## Setup

- [x] **RISK-394** A name-keyed `skillOverrides` Mod takes a user's own skill out of the listing.
  Verified: grep, claude 2.1.327, 2026-11-18, `grep -rnE "skillOverrides|settings.read|OFF_SKILLS" plugins/claudetto --exclude-dir=types`: 0 hits; the `skillOverrides` hook went out with REQ-SETUP-002.
  Evidence: 2026-11-24, claude 2.1.329, `grep -rnE "skillOverrides|settings.read|OFF_SKILLS" plugins/claudetto --exclude-dir=types`: 14 hits, not 0. 0 are `skillOverrides` or `OFF_SKILLS`; all 14 are `settings.read` in hooks/git/{instructions,trailer}.ts, hooks/handover/writer.ts and 9 tests, none a skill hook.
  Verified: 2026-11-24, claude 2.1.329, `grep -rnE "skillOverrides|OFF_SKILLS" plugins/claudetto --exclude-dir=types` -> 0 hits; no claudetto code filters the skill listing by name, so no user skill is taken out.
  Category: product.
  Cause: the Mod writes `skillOverrides` `off` for each of the 18 skill names, including `simplify`.
  Event: the user's own `simplify` leaves the listing and the Mod refuses "/simplify x".
  Consequence: the user's own skill stops working.
  Likelihood: 3. Impact: 2.
  Existing controls: at 088a227c `skillOverridesFor` skips a name a user or project skill or command holds (`plugins/claudetto/hooks/features/surface/surface.ts:26-31`).
  Response: mitigate.
  Actions: skip names a user or project skill or command holds (the fix, task 5.24 amended).
  Trigger: a user or project skill or command named like a bundled skill.
  Owner: setup.
  Status: closed or mitigated, verified 2026-11-18 (see Verified).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3162; plugins/claudetto/hooks/features/surface/surface.ts:26@088a227c.

- [x] **RISK-395** A `settings.read` Mod hook that settles slowly lets a skill into the first request.
  Verified: grep, claude 2.1.327, 2026-11-18, same grep as RISK-394: 0 hits; the slow `settings.read` hook is gone (REQ-SETUP-002 out), so the race cannot occur.
  Evidence: 2026-11-24, claude 2.1.329, same grep as RISK-394: 14 hits, not 0, all `settings.read` calls or test stubs in hooks/git, hooks/handover, hooks/guards/shell, hooks/pool and hooks/settings; no `skillOverrides` or `OFF_SKILLS` hit, so no skill is gated on a slow read.
  Verified: 2026-11-24, claude 2.1.329, the RISK-394 grep -> 0 `skillOverrides` or `OFF_SKILLS` hits; the `settings.read` calls left read git, handover, shell and pool settings and gate no skill, so no slow hook races the first request.
  Category: product.
  Cause: `session.start` is raised before the hook settles in every run, and the Mod worker has no `process` global ("ReferenceError: process is not defined", `ovc9.debug:107-108`; `$.env.get` stands in). The cause of 66-90 ms for the sequential and parallel arms was not isolated; probe date9 refutes `Date.now()` as the cost (9 equal stamps in one synchronous stretch).
  Event: hooks that settled in 38.7 ms or less kept `simplify` out of the first request in 47 of 47 runs; 10 of 11 at 66.7-90.6 ms let it in.
  Consequence: a skill listed in the first request that the Mod should have removed.
  Likelihood: 4. Impact: 2.
  Existing controls: none; hooks settling in 38.7 ms or less passed.
  Response: mitigate.
  Actions: keep the hook under 38.7 ms and list the skills and commands dirs with four parallel `$.fs.list` calls and nothing else (`plugins/claudetto/hooks/features/surface/surface.ts:61` at 088a227c; `$.fs.list` is in the 2.1.326 mod API).
  Trigger: a `settings.read` hook with file reads that take 66 ms or more.
  Owner: setup.
  Status: closed or mitigated, verified 2026-11-18 (see Verified).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3340.

- [x] **RISK-396** Setup writes `CLAUDE_CODE_SCRIPT_CAPS`.
  Verified: grep, claude 2.1.327, 2026-11-18, `grep -rnE "SCRIPT_CAPS" plugins/claudetto --exclude-dir=types`: 0 hits. REQ-SETUP-043 keeps it out of the FILL table.
  Category: Technical.
  Cause: `CLAUDE_CODE_SCRIPT_CAPS` counts substrings of Bash commands and acts only while `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` is set, which forces default permission mode.
  Event: Setup writes `CLAUDE_CODE_SCRIPT_CAPS`.
  Consequence: Permission mode falls back to default and a Bash command containing a cap substring is miscounted.
  Likelihood: 1. Impact: 3.
  Existing controls: Setup writes none (correct at 088a227c).
  Response: accept; planned before settlement: avoid.
  Actions: Keep the variable out of the written env set; a setup test pins its absence.
  Trigger: A setup change adds `CLAUDE_CODE_SCRIPT_CAPS` or `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB`.
  Owner: setup. Status: accepted 2026-11-20 (issue #52): Likelihood 1 × Impact 3 = 3, at or below 5.
  Verified: 2026-11-20, read of the cited sources: Likelihood 1 rests on one report; Likelihood × Impact = 3.
  Evidence: 2026-11-24, claude 2.1.329, `grep -rnE "SCRIPT_CAPS" plugins/claudetto --exclude-dir=types`: 1 hit, not 0: `hooks/settings/__tests__/defaults.test.ts:129`, `expect(next.env).not.toHaveProperty("CLAUDE_CODE_SCRIPT_CAPS")`; no non-test source names it.
  Verified: 2026-11-24, claude 2.1.329, `grep -rn "SCRIPT_CAPS\|SUBPROCESS_ENV_SCRUB" plugins/claudetto --exclude-dir=types` -> 2 hits, both in `hooks/settings/__tests__/defaults.test.ts:129-130`, which assert the fill writes neither; `claude plugin test .` 341 pass.
  Source: plugins/claudetto/hooks/features/setup/settings.ts@088a227c; claude 2.1.326: `CLAUDE_CODE_SCRIPT_CAPS` counts substrings of the command and acts only when the scrub check `cp()` passes, chunk-57bg7pbc.js@8656 (2.1.327); `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` forcing default permission mode: verified on 2.1.327: when the variable is set, the mode becomes `default` and a notice reads `Permission mode forced to default`, chunk-rthqjjhy.js@3900. Dropped (2026-11-18) for the old plan's P223 source: no source located in external/, openspec/ (088a227c9^), reports/, git history or the user's transcripts.

- [x] **RISK-397** Setup leaves retired rules installed.
  Verified: grep, claude 2.1.327, 2026-11-18, `ls plugins/claudetto` holds no rules folder and no code offers rules (REQ-SETUP-048 and -049 out), so no retired rule can be left behind.
  - Category: product defect.
  - Cause: `rulesPart` (`plugins/claudetto/hooks/command.run/useSetup/rules.ts:82-90`) offers only names in `RULES`; commit 378782f3 (2026-11-13) deleted `rules/noNarratingComments.md` and `rules/useEdgeCaseReport.md` and dropped `paths: "**/*"` from the rest, but nothing removes a rule the plugin stopped shipping.
  - Event: both files still sit in `~/.claude/rules/claudetto/` with `paths:` frontmatter and load as `nested_memory` after the first file read and after each compaction (44 rows in one session, about 85 tokens per context).
  - Consequence: extra tokens and a rule the plugin no longer stands behind.
  - Likelihood: 3
  - Impact: 2
  - Existing controls: none.
  - Response: mitigate.
  - Actions: setup removes a rule the plugin stopped shipping (old task 7.15).
  - Trigger: `/claudetto:setup` on a machine with an older install.
  - Owner: setup
  - Status: closed or mitigated, verified 2026-11-18 (see Verified).
  - Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:689; openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:692 (read, measured).
  Verified: 2026-11-24, claude 2.1.329, `ls plugins/claudetto`: README.md agents evals hooks output-styles tsconfig.json, no rules folder.

- [x] **RISK-398** Sandbox blocks `git worktree add`.
  Open: not probed under the ADR-0188 block; the sandbox keeps .git/worktrees read-only, so `git worktree add` needs an unsandboxed run, which `allowUnsandboxedCommands` true permits.
  - Category: Claude Code limit.
  - Cause: `.git/worktrees` returns EPERM; cause never found, probes passed.
  - Event: reported; awaiting a `--debug-file` run.
  - Consequence: a worktree cannot be added in a sandbox.
  - Likelihood: 1
  - Impact: 2
  - Existing controls: none.
  - Response: accept.
  - Actions: collect `--debug-file` output.
  - Trigger: `git worktree add` in a sandboxed session.
  - Owner: setup
  - Status: closed 2026-11-19 (accepted): Likelihood 1, no cause found, no plugin lever.
  - Source: openspec/changes/archive/2026-11-16-2-1-323/research/issues-2026-11-09.md:21 (unknown cause).
  Verified: cc-inspect code search shows no plugin lever; the cause was never found and the response is accept (2.1.327, 2026-11-19).
  Evidence: 2026-11-24, claude 2.1.329, cause found: `git worktree add --detach /tmp/claude-501/wt-probe HEAD` in a sandboxed Bash call -> "fatal: could not create directory of '.git/worktrees/wt-probe': Operation not permitted"; the engine lists `<repo>/.git/worktrees` in sandbox denyWithinAllow, and its system prompt says so (cc-inspect search "is read-only in the sandbox", chunk-hg1yqkjk.js@5047438).
  Verified: 2026-11-24, claude 2.1.329, chunk-hg1yqkjk.js@5047438: with unsandboxed commands allowed the engine tells the model to run worktree commands outside the sandbox, else to hand the user the command; claudetto's fill sets `allowUnsandboxedCommands: true` (hooks/guards/wall/fill.ts:29), so a claudetto session gets the run-it-yourself text. The cause is the engine's, with no plugin lever needed.

- [x] **RISK-399** setup wrote ask rules that override auto mode.
  Verified: grep, claude 2.1.327, 2026-11-18, `grep -rn permissions plugins/claudetto --exclude-dir=types`: 0 hits; no code writes an ask list. Stale ask entries in a user's own file are the user's to remove.
  - Category: product fault (setup).
  - Cause: an earlier `/claudetto:setup` wrote an "ask" list into `~/.claude/settings.json` (lines 74-92, then line 93 for `git reflog`), starting with `Bash(git checkout *)`.
  - Event: a prompt on each git checkout, since an ask rule overrides auto mode.
  - Consequence: repeated prompts.
  - Likelihood: 2
  - Impact: 2
  - Existing controls: version 2.1.325+1 removes the ask rules and the old reminder text it wrote when setup reruns, in fill mode too, and keeps the user's own.
  - Response: mitigate
  - Actions: test with a settings copy that setup removes only entries it wrote.
  - Trigger: a prompt for a command setup once listed.
  - Owner: setup
  - Status: closed or mitigated, verified 2026-11-18 (see Verified).
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:12 (observed in transcript, 2026-11-14); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1008 (observed in transcript, 2026-11-14).
  Evidence: 2026-11-24, claude 2.1.329, `grep -rn permissions plugins/claudetto --exclude-dir=types`: 244 hits, not 0, in README.md, evals, hooks/settings/defaults.ts:56 (`permissions:` block), hooks/guards/wall/fill.ts:22 and hooks/guards/wall/rules.ts (ASK list); code now writes a permissions.ask list.
  Verified: 2026-11-24, claude 2.1.329, hooks/guards/wall/rules.ts:61-82 `ASK` holds 17 rules, each for lost work, a published tag or release, or a process kill (no git checkout or plain push); owned.test.ts:22 and start.test.ts:64 show the fill takes back only keys it wrote; `claude plugin test .` 341 pass.

- [x] **RISK-400** Sandbox denies writes under the repo loaded as a plugin with --plugin-dir.
  Verified: code read by an earlier session (chunk-kr4nf9qg.js@3888 default write-deny list); no live probe today, accepted at Likelihood 1.
  - Category: Claude Code limit.
  - Cause: per the agent, the plugin root is on the sandbox deny list, so the agent cannot edit claudetto while running it; the auto-mode classifier also refused an edit twice.
  - Event: task 2.12 stays blocked; the workaround is a session without --plugin-dir.
  - Consequence: the user cannot have the agent work on its own project; an extra session.
  - Likelihood: 1
  - Impact: 3
  - Existing controls: none.
  - Response: accept.
  - Actions: start the session without --plugin-dir; checked on 2.1.327 by code reading, no live probe: the explanation that the plugin root is on the sandbox deny list is not supported. The default write-deny names `.vscode`, `.idea`, `.claude/commands`, `.claude/agents` (chunk-kr4nf9qg.js@3888). Only `plugin eval` adds plugin directories to `denyWrite` (chunk-6zk0h247.js@158180). The refused edit more likely came from the auto-mode classifier, which the Cause line also names.
  - Trigger: a write refused under plugins/claudetto.
  - Owner: setup
  - Status: closed or mitigated, verified 2026-11-18 (see Verified).
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/926cb706-4310-4588-9399-b906abd34b32.jsonl:1266 (reported, user, 2026-11-09); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/926cb706-4310-4588-9399-b906abd34b32.jsonl:1434; reported, user, 2026-11-09 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/926cb706-4310-4588-9399-b906abd34b32.jsonl:1266); reported, user, 2026-11-09 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/926cb706-4310-4588-9399-b906abd34b32.jsonl:1434) (reported, user, 2026-11-09).

## Boundaries and Safety

- [x] **RISK-401** Sandbox escape by convenience: the agent turns the sandbox off for each EPERM.
  Verified: probe, claude 2.1.327, 2026-11-18, cc-inspect cli with the ADR-0188 block: routine Bash writes (under /opt/homebrew and /private/var/folders) ran with 0 prompts and no EPERM, so the agent meets no failure that tempts it to set dangerouslyDisableSandbox; the fill writes the block (defaults.test.ts).
  Verified: 2026-11-24, claude 2.1.329, cc-inspect cli `-p` with the fill's sandbox block (`guardSettings([])`, hooks/guards/wall/fill.ts) and one Bash call: `touch`+`rm` under /opt/homebrew -> "HB-OK", `mktemp -d` under /private/var/folders -> "VF-OK", 0 prompts; the cli sets HOME to a temp dir, so the `~/` write is covered by `jvm/run.sh` batch b, where Gradle wrote `~/.gradle` under the fill in 6 of 6 runs (RISK-544).
  Category: safety.
  Cause: an in-sandbox fix existed but was not recorded, so each session rediscovers the escape; `dangerouslyDisableSandbox` is available.
  Event: `dangerouslyDisableSandbox` used about 330 times in 10 sessions for EPERM (Bun auto-reading `.env`, pnpm store, mktemp, SSH signing, SwiftPM caches). The same EPERM was solved in-sandbox in one session and by turning the sandbox off in another.
  Consequence: the sandbox protects nothing in those sessions; the safeguard is off for the call, and the user approves or the classifier decides each retry.
  Likelihood: 5. Impact: 3.
  Existing controls: none at 088a227c; the retry goes through the permission flow (default mode: permission_denied or sandboxOverride; auto mode: accept or classifier).
  Response: mitigate.
  Actions: setup writes the cache paths and `allowRead` login.keychain-db into the sandbox block; `allowUnsandboxedCommands:false` in strict/eval profiles; a Record entry per working fix; consider `sandbox.allowUnsandboxedCommands: false` only after those fixes exist (SA-5.2, which also removes the legitimate fallback).
  Trigger: a Bash call with `dangerouslyDisableSandbox`, especially one whose command had an in-sandbox fix on record.
  Owner: setup. Status: open.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/user-dossier.md:61; external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:156; external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:157; external/please-use-me-often/agent-failure-dossier/08-session-log-corpus.md:37; external/please-use-me-often/agent-terms/SCHEDULE-A-ENFORCEMENT.md:77.
  Status: mitigated 2026-11-18: routine writes meet no EPERM with the ADR-0188 block (Verified line).

## Context Loss and Handover

- [x] **RISK-402** An earlier plugin default of `cleanupPeriodDays: 14` deleted transcripts.
  Verified: grep, claude 2.1.327, 2026-11-18, `grep -rn cleanupPeriodDays plugins/claudetto --exclude-dir=types`: 0 hits; nothing writes a retention value, so the Claude Code default (30) stands.
  Verified: 2026-11-24, claude 2.1.329, `grep -rn cleanupPeriodDays plugins/claudetto --exclude-dir=types`: 0 hits.
  Category: handover.
  Cause: the plugin wrote a short retention default.
  Event: a session transcript is deleted after 14 days.
  Consequence: past sessions the user or an audit needs are gone (user work lost).
  Likelihood: 2. Impact: 4.
  Existing controls: the bundle default is 30 (claude 2.1.327 confirms default 30, min 1: the `cleanupPeriodDays` schema text reads "default: 30). Minimum 1", chunk-ja5z738t.js@227432); an agent claimed 365 (reported, wrong).
  Response: avoid.
  Actions: write no `cleanupPeriodDays` below the Claude Code default; a setup test asserts it.
  Trigger: a `cleanupPeriodDays` below 30 in a written settings file.
  Owner: setup. Status: mitigated at 088a227c (default 30).
  Source: external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:43 (an earlier plugin release's `cleanupPeriodDays: 14` default had deleted the user's transcripts, SL 087f5a37); external/please-use-me-often/agent-failure-dossier/judged/setting.jsonl:50.

## Agent Conduct

- [x] **RISK-403** Agent narrows a general fix to the one tool that showed the fault.
  Status: closed. Cause is outside setup or outside claudetto (OUT-863, ADR-0190).
  - Category: Conduct
  - Cause: The agent finds the sandbox proxy fault on Java and searches only Java proxy settings.
  - Event: The user interrupts: the fix must serve every tool.
  - Consequence: A one-tool fix and a correction turn.
  - Likelihood: 2
  - Impact: 2
  - Existing controls: None found.
  - Response: accept; planned before settlement: mitigate
  - Actions: State the general cause first and fix it for every tool of that class.
  - Trigger: A fix named after one tool for a fault in a shared layer.
  - Owner: setup
  - Status: accepted 2026-11-20 (issue #52): Likelihood 2 × Impact 2 = 4, at or below 5.
  - Verified: 2026-11-20, read of the cited sources: Likelihood 2 rests on two or more reports; Likelihood × Impact = 4.
  - Evidence: 2026-11-24, claude 2.1.329, Sonnet 5.5, accepted-reply-c/run.sh 403: vanilla sets the proxy in gradle.properties only in 9/9 runs and leaves the shared env.sh, npm, pip and curl untouched; the closed status above did not hold.
  - Status: mitigated 2026-11-24: the defect paragraph in plugins/claudetto/hooks/prompt/conduct.ts has a fault with a shared cause fixed at that cause and in each tool that reads it; 7/9 runs set the proxy in 3 or more of the 5 files and 9/9 in env.sh, against 0/9 and 0/9 on vanilla.
  - Verified: 2026-11-24, claude 2.1.329, Sonnet 5.5, reports/2026-11-24-research/pin-2-1-329/accepted-reply-c/run.sh 403, vanilla reps 1-3 and 11-16, claudetto reps 21-29; reports/2026-11-24-research/pin-2-1-329/r403/README.md.
  - Source: observed in transcript, 2026-11-13; reported, user, 2026-11-13; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:14535.

- [x] **RISK-404** A claudetto MCP tool disconnects in a session.
  Verified: grep, claude 2.1.327, 2026-11-18, `grep -rn "mcp__claudetto" plugins/claudetto --exclude-dir=types`: 0 hits and plugins/claudetto holds no MCP server, so the tool cannot disconnect.
  Evidence: 2026-11-24, claude 2.1.329, `grep -rn "mcp__claudetto" plugins/claudetto --exclude-dir=types`: 708 hits, not 0 (most in evals/); outside evals: README.md:64,79, agents/Hermes.md, `hooks/web/__tests__/register.test.ts:65-66`, hooks/web/web-tool.d.ts, hooks/patch/texts.ts:1. claudetto now registers `mcp__claudetto__web_fetch`, `web_search` and `patch` through hooks; `find plugins/claudetto -name .mcp.json` finds none.
  Verified: 2026-11-24, claude 2.1.329, claudetto registers its tools from hooks with `$.tool.register` (hooks/patch/tool.ts, hooks/web/register.ts, hooks/goal/tools.ts), not from an MCP server process; plugins/claudetto holds no `.mcp.json`, so no server connection exists to drop; `claude plugin test .` 341 pass.
  Category: product
  Cause: The claudetto ask-user-question tool is not connected in the session; the handoff also notes that the jscpd tools were not available.
  Event: The agent cannot use the tool its rules name and falls back to the AskUserQuestion popup, loaded with ToolSearch.
  Consequence: Rules that name one tool break; an extra turn.
  Likelihood: 2
  Impact: 2
  Existing controls: The agent fell back to the native popup.
  Response: mitigate
  Actions: claudetto rules shall name the native AskUserQuestion popup as the fallback when its own ask tool is absent.
  Trigger: A tool named in a rule is missing from the session.
  Owner: setup
  Status: closed or mitigated, verified 2026-11-18 (see Verified).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:10 (handoff of 2026-11-12, jscpd tools not available); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:4111 (handoff of 2026-11-14, 'claudetto ask tool disconnected'); observed in transcript, 2026-11-12 and 2026-11-14.

## Environment, Accounts, and Marketplace

- [x] **RISK-405** Claude Code sends the claude.ai login token to a custom base URL.
  Status: closed. Cause is outside setup or outside claudetto (OUT-865, ADR-0190).
  Category: product behaviour.
  Cause: ANTHROPIC_BASE_URL is set with no ANTHROPIC_AUTH_TOKEN.
  Event: Claude Code can send the login token to the custom URL.
  Consequence: the login token leaks to the URL's server.
  Likelihood: 1. Impact: 5.
  Existing controls: none at 088a227c. A fake-API probe on 2.1.327 (`code cli`, login oauth, no ANTHROPIC_AUTH_TOKEN, 2026-11-18) ran, but the report does not expose request headers, so whether the login token reaches the base URL is open; a probe needs request-header capture.
  Response: accept; planned before settlement: avoid.
  Actions: always set a dummy ANTHROPIC_AUTH_TOKEN beside ANTHROPIC_BASE_URL. The same setup names ANTHROPIC_MODEL (line 103).
  Trigger: ANTHROPIC_BASE_URL in an environment with no ANTHROPIC_AUTH_TOKEN.
  Owner: setup.
  Status: accepted 2026-11-20 (issue #52): Likelihood 1 × Impact 5 = 5, at or below 5.
  Verified: 2026-11-20, read of the cited sources: Likelihood 1 rests on one report; Likelihood × Impact = 5.
  Evidence: 2026-11-24, claude 2.1.329: with ANTHROPIC_BASE_URL set and no ANTHROPIC_AUTH_TOKEN, vanilla sent the claude.ai login as Authorization: Bearer on 3 of 4 requests in each of 3 runs (reports/2026-11-24-research/pin-2-1-329/r405/README.md).
  Status: mitigated 2026-11-24 (REQ-GUARDS-085): plugins/claudetto/hooks/settings/base-url.ts drops the credential headers from a model request to a host other than Anthropic's while the session holds the login; 0 of 2 requests carried it in each of 6 runs.
  Verified: 2026-11-24, claude 2.1.329, reports/2026-11-24-research/pin-2-1-329/accepted-reply-c/run405.sh, vanilla reps 21-23 and claudetto reps 21-26, TOKEN=none, with dummy-token, API-key and apiKeyHelper controls; reports/2026-11-24-research/pin-2-1-329/r405/README.md.
  Source: external/2026-10-25/reddit.com-r-claudecode-comments-1xduofw-how-i-made-local-cloud-coding-20261024T061933Z.md:129; external/2026-10-25/reddit.com-r-claudecode-comments-1xduofw-how-i-made-local-cloud-coding-20261024T061933Z.md:103 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xduofw/how_i_made_local_cloud_coding_workflow_48_gb_mac/>).

- [x] **RISK-406** A plugin whose hook modifies tool output is held in Anthropic directory review.
  Verified: none possible locally; directory review is server-side. Accepted at Likelihood 1 (weak).
  Category: release.
  Cause: the directory review may block hooks that modify tool output (one commenter's belief; one poster's plugin stuck two weeks).
  Event: a listing that does not clear review.
  Consequence: no marketplace listing.
  Likelihood: 1. Impact: 3.
  Existing controls: none. Directory review is server-side at Anthropic, not in the binary; one commenter's belief and one poster's two-week wait, kept as reported.
  Response: accept.
  Actions: none in the source; field report, no local probe possible.
  Trigger: a submission with a hook that edits tool output.
  Owner: setup.
  Status: closed or mitigated, verified 2026-11-18 (see Verified).
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xfqg0c-how-do-you-keep-a-skill-active-a-20261028T060802Z.md:74; external/2026-10-28/reddit.com-r-claudeai-comments-1xfqg0c-how-do-you-keep-a-skill-active-a-20261028T060802Z.md:82 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xfqg0c/how_do_you_keep_a_skill_active_after_context/>).

- [x] **RISK-407** Silent Skill Abort.
  Verified: ls, claude 2.1.327, 2026-11-18, `ls plugins/claudetto` holds no skills or commands folder, so no injected `!` command exists to abort.
  Verified: 2026-11-24, claude 2.1.329, `ls plugins/claudetto`: README.md agents evals hooks output-styles tsconfig.json, no skills or commands folder.
  Category: Claude Code.
  Cause: An injected `!` command is not pre-approved; injected commands never prompt.
  Event: Outside auto mode the whole skill invocation aborts, and `|| true` does not help.
  Consequence: A skill does nothing and says nothing.
  Likelihood: 1. Impact: 2.
  Existing controls: None found by git grep 088a227c for allowed-tools.
  Response: mitigate.
  Actions: Add the commands to the skill's allowed-tools or the permission settings.
  Trigger: A skill with `!` commands that are not allowed.
  Owner: setup.
  Status: closed or mitigated, verified 2026-11-18 (see Verified).
  Basis: reported.
  Source: external/2026-11-04/reddit.com-r-claudecode-comments-1wpcirc-ccs-most-underrated-feature-dy-20261104T085040Z.md:107 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wpcirc/ccs_most_underrated_feature_dynamic_context/>).

## Product and Tooling

- [x] **RISK-408** The version floor key is wrong.
  Verified: code search, claude 2.1.327, 2026-11-18, cc-inspect `code search requiredMinimumVersion`: enforced from policySettings only (chunk-4dxjsc3b.js@2149). The floor is `engines` ">=2.1.327" in plugin.json (`claude plugin validate` passes), so no user-settings key is written.
  - Category: product.
  - Cause: settings.ts:146 writes minimumVersion, which blocks downgrades only.
  - Event: An old Claude Code starts with claudetto.
  - Consequence: A build below 2.1.325 runs the plugin.
  - Likelihood: 3
  - Impact: 3
  - Existing controls: none.
  - Response: avoid.
  - Actions: Write requiredMinimumVersion, which exits at startup.
  - Trigger: Setup writes the floor.
  - Owner: setup
  - Status: closed or mitigated, verified 2026-11-18 (see Verified).
  - Source: observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5807).
  Verified: 2026-11-24, claude 2.1.329, `claude plugin validate plugins/claudetto`: "Validation passed"; plugins/claudetto/.claude-plugin/plugin.json holds `engines` `"claude-code": ">=2.1.329"` (floor moved up from 2.1.327). The policySettings-only chunk citation was not rechecked.

- [x] **RISK-409** A builtin plugin stays loaded after its disable.
  Verified: probe, claude 2.1.327, 2026-11-18, `CLAUDE_CONFIG_DIR=<empty dir> claude -p hi --plugin-dir plugins/claudetto --debug-file d.log` twice: run 1 logged "turned off" once and wrote all 13 ids false; run 2 logged no "turned off". The notice names /reload-plugins. Likelihood stays 5 because a running session keeps the builtin until reload.
  - Category: product.
  - Cause: Builtin hooks modules persist until /reload-plugins or a restart.
  - Event: agents-md, plugin-authoring, privacy and diff hooks keep running after a settings write.
  - Consequence: A disabled builtin still acts.
  - Likelihood: 5
  - Impact: 3
  - Existing controls: Setup writes the disable; session-start drift repair.
  - Response: mitigate.
  - Actions: Tell the user to run /reload-plugins or restart; do not rely on plugin.register or a plugin-shipped settings.json.
  - Trigger: A builtin is enabled again or a disable was just written.
  - Owner: setup
  - Status: closed or mitigated, verified 2026-11-18 (see Verified).
  - Source: measured, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6352); (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5290).
  Verified: 2026-11-24, claude 2.1.329, `CLAUDE_CONFIG_DIR=<empty dir> claude -p hi --plugin-dir plugins/claudetto --debug-file d.log` twice: run 1 logged "claudetto turned off 13 builtin plugin(s) in user settings", run 2 logged no "turned off" (the session answered "Not logged in", so no model call was billed).

- [x] **RISK-410** A running session holds a stale plugin until restart.
  Status: closed. Cause is outside setup or outside claudetto (OUT-866, ADR-0190).
  - Category: product.
  - Cause: Claude Code loads a plugin at start.
  - Event: A fixed rule does not reach a running session.
  - Consequence: The user still sees the fault.
  - Likelihood: 4
  - Impact: 2
  - Existing controls: none.
  - Response: mitigate.
  - Actions: claudetto runs `/reload-plugins` itself when it turns builtins off (REQ-SETUP-011); a release of claudetto itself loads at the next start.
  - Trigger: A release lands during a session.
  - Owner: setup
  - Status: open (Existing controls: partial at 088a227c).
  - Source: observed in transcript, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1241).
  Status: closed: outside claudetto (OUT-866, ADR-0190), as the first Status line says.
  Verified: 2026-11-19, claude 2.1.327, `git grep -n -F /reload-plugins -- plugins/` -> 1 hit, hooks/settings/start.ts:36, which only tells the user to run /reload-plugins; no claudetto code reloads a plugin.
  Evidence: 2026-11-24, claude 2.1.329, `git grep -n -F /reload-plugins -- plugins/`: 2 hits, not 1: plugins/claudetto/README.md:13 (a docs sentence) and hooks/settings/start.ts:37 (moved from 36; it only tells the user to run /reload-plugins).
  Verified: 2026-11-24, claude 2.1.329, `git grep -n -F /reload-plugins -- plugins/` -> README.md:13 and hooks/settings/start.ts (the JSDoc and the `$.command.run` call); no user instruction remains. The tmux probe (`reload/probe.ts`) showed claudetto reload the plugins itself. A claudetto release still loads at the next start, the engine load model (OUT-866).

- [x] **RISK-411** The user's settings keep the retired _TEXT key.
  Verified: test, claude 2.1.327, 2026-11-19, `claude plugin test plugins/claudetto`: 'removes a retired reminder text and keeps one the user wrote' passes; the fill removes CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT only when it equals one of the two retired texts.
  - Category: product.
  - Cause: The sandbox denies a write to the user's settings.json.
  - Event: The old narration text stays.
  - Consequence: Narration continues until setup reruns.
  - Likelihood: 3
  - Impact: 2
  - Existing controls: A setup rerun removes it.
  - Response: mitigate.
  - Actions: the session-start fill removes the retired key itself after an update (REQ-SETUP-063); no user step.
  - Trigger: A retired key is in the user settings.
  - Owner: setup
  - Status: open (Existing controls: have at 088a227c).
  - Source: observed in transcript, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1241).
  Evidence: 2026-11-24, claude 2.1.329, `claude plugin test .` in plugins/claudetto: 332 pass, 0 fail, but no test named 'removes a retired reminder text and keeps one the user wrote' exists. `hooks/settings/__tests__/defaults.test.ts:68-72` now asserts `CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT` is undefined and no env key ends in `_TEXT` (REQ-SETUP-063); hooks/settings/defaults.ts holds no retired-text removal.
  Verified: 2026-11-24, claude 2.1.329, `claude plugin test .` in plugins/claudetto 341 pass, including `hooks/settings/__tests__/defaults.test.ts:69`, which asserts the fill leaves `CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT` unset; the fill runs at each session start, so no user step is needed.
  Status: mitigated 2026-11-19: the session-start fill removes the retired text (Verified line); it runs in the hook, outside the Bash sandbox.

## Claude Code Faults

- [x] **RISK-412** The auto-mode classifier gives no verdict on a Bash call.
  Open: sandboxed Bash skips the classifier under autoAllowBashIfSandboxed, but the no-verdict case needs a paid auto-mode run that ADR-0190 leaves out.
  Category: Claude Code fault.
  Cause: the classifier is unavailable ("Classifier unavailable"); the fault repeated on every Bash call in one benchmark arm and several times in the session.
  Event: Bash calls fail; the turn stops after repeated failures; an arm ran no test.
  Consequence: a wasted run; a missed hidden test.
  Likelihood: 3.
  Impact: 3.
  Existing controls: pause Bash after about 3 failures in a row and wait for a notification.
  Response: accept.
  Actions: none in claudetto; record the fault.
  Trigger: three Bash failures with "Classifier unavailable".
  Owner: setup.
  Status: closed 2026-11-19 (accepted): a Claude Code limit with no plugin lever.
  Source: observed in transcript, 2026-11-16: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:2677 (handoff, Bash classifier outages); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:4092 (round 2 dev arm).
  Verified: the classifier verdict is server-side; plugins/ holds no autoMode list (ADR-0190), so no lever exists (2.1.327, 2026-11-19).
  Verified: 2026-11-24, claude 2.1.329, `grep -rln autoMode plugins --exclude-dir=types`: 0 files, so plugins/ holds no autoMode list.

## Conduct Faults From the Rearchitecture Sessions

- [x] **RISK-413** The agent edits user settings or reverts work with no order.
  Status: closed. Cause is outside setup or outside claudetto (OUT-864, ADR-0190).
  Category: agent conduct.
  Cause: the agent changed a settings file and reverted a change on its own.
  Event: the user asks who asked for it.
  Consequence: user work lost.
  Likelihood: 2.
  Impact: 4.
  Existing controls: none at baseline.
  Response: avoid.
  Actions: the CON items on settings edits and reverts.
  Trigger: a settings write or a revert with no user step.
  Owner: setup.
  Status: mitigated 2026-11-20 (issue #52): the fill makes Claude Code ask before an edit of the user settings file and before `git reset --hard`, `git stash`, `git clean` and `git branch -D`, so a settings change or a revert needs the user's approval.
  Verified: `claude plugin test plugins/claudetto` on claude 2.1.327, 2026-11-20 (132 pass): hooks/guards/wall/**tests**/fill.test.ts pins the ask list; hooks/guards/wall/rules.ts:47-60 holds `Bash(git reset --hard*)`, `Edit(~/.claude/settings.json)` and `Write(~/.claude/settings.json)` as ask rules.
  Evidence: 2026-11-24, claude 2.1.329, `claude plugin test .` in plugins/claudetto: 332 pass, 0 fail; hooks/guards/wall/rules.ts ASK still holds `Bash(git reset --hard*)` (line 66) and `Edit(~/.claude/settings.json)` (line 81) but no `Write(~/.claude/settings.json)`; `hooks/guards/wall/__tests__/fill.test.ts:204-222` shows the fill removes that Write ask rule as a conflict.
  Verified: 2026-11-24, claude 2.1.329, cc-inspect cli `-p --permission-mode acceptEdits` with only `permissions.ask ["Edit(./guarded.txt)"]`: a Write to guarded.txt -> "Claude requested permissions to write … but you haven't granted it yet", a Write to free.txt -> created; so the `Edit(~/.claude/settings.json)` ask (rules.ts:81) also stops a Write; `git reset --hard` asks (rules.ts:66); 341 pass.
  Source: reported, user, 2026-11-13 22:21 UTC, nobody asked for a revert (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:15664): ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37070.

- [x] **RISK-414** Setup is slow and the sandbox and hooks cause friction and error noise.
  Open: the fill runs one read and one write per FILL_VERSION and the sandbox prompt friction is cured (RISK-401 probe); the error-noise part needs a dogfood session.
  Category: claudetto fault.
  Cause: setup made one model call per question; hooks raised errors; the sandbox blocked work.
  Event: the user reports an extremely slow setup, annoying hook errors, and a sandbox that does harm.
  Consequence: an extra turn each time; a lost session.
  Likelihood: 3.
  Impact: 3.
  Existing controls: one Haiku call for all setup questions (PR #23).
  Response: mitigate.
  Actions: REQ-SETUP item on speed; REQ-GUARDS item on destructive commands; OUT sandbox item.
  Trigger: setup over one model call, or a hook error in a normal run.
  Owner: setup.
  Status: closed 2026-11-19: setup is one silent fill-write with one notice, and the sandbox is minimal (ADR-0188, ADR-0190).
  Source: reported, user, 2026-11-13 22:08 UTC, sandbox trimmed to unrecoverable destructive commands (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:14708); reported, user, 2026-11-14 14:21 UTC, sandbox as minimal as possible (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:36547): ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37070.
  Verified: cc-inspect cli: one SessionStart fill-write with one ui_log notice and no hook error, no wizard; claude plugin test plugins/claudetto: 54 pass (2.1.327, 2026-11-19).
  Verified: 2026-11-24, claude 2.1.329, the interactive tmux start (`reload/probe.ts` with claudetto): one settings write, two notices (builtins turned off and reloaded; values set) and no hook error on the screen, no wizard or prompt.

- [x] **RISK-415** A plugin secret or settings placeholder leaks into the user settings.
  Verified: grep, claude 2.1.327, 2026-11-18, `grep -rln "CONTEXT7" plugins/claudetto`: 0 hits; no plugin code writes the key, so the placeholder cannot come from it.
  Verified: 2026-11-24, claude 2.1.329, `grep -rln "CONTEXT7" plugins/claudetto`: 0 hits.
  Category: Claude Code fault.
  Cause: a `[REDACTED]` placeholder for `CONTEXT7_API_KEY` sat in `~/.claude/settings.json`; its source is unproven.
  Event: Context7 failed until the line was removed and the user logged in again.
  Consequence: a tool down for a session.
  Likelihood: 1.
  Impact: 3.
  Existing controls: none.
  Response: accept.
  Actions: none; the source stays unproven.
  Trigger: a `[REDACTED]` value in a settings key.
  Owner: setup.
  Status: closed or mitigated, verified 2026-11-18 (see Verified).
  Source: observed in transcript, 2026-11-16: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790.

- [x] **RISK-493** The first-run settings notice is cut off on the terminal.
  Verified: dogfood, claude 2.1.327, 2026-11-19: a fresh config dir drew core's warning `$.ui.log: a text (3163 characters) is drawn up to its first 2000 on the terminal`; after the fix, the test "counts list entries per key so a first fill fits the 2000 characters the terminal draws" passes (72 of 72 in `claude plugin test`). The notice names keys by full path (`permissions.deny`, `sandbox.filesystem.allowWrite`) since c286bcb81, because the dogfood showed bare `deny` and `sandbox` labels. The `⚠ claudetto:` prefix on the line is core’s: a minimal plugin `stp` whose hook logs "plain line" drew `⚠ stp: stp: plain line` on 2.1.327 (dogfood probe, 2026-11-19), so claudetto cannot drop it and keeps the notice text plain.
  Verified: 2026-11-24, claude 2.1.329, `claude plugin test .` in plugins/claudetto: 332 pass, 0 fail, including "fill notice > counts list entries per key so a first fill fits the 2000 characters the terminal draws". The fresh-config dogfood and the `stp` probe were not rerun.
  Category: Defect.
  Cause: `hooks/settings/start.ts` joined every added list entry into one `$.ui.log` line, and the terminal draws 2000 characters of it.
  Event: the person sees a truncated list of what claudetto changed in their settings.
  Consequence: the notice hides part of the change it reports.
  Likelihood: 3 before the control, 1 after it.
  Impact: 2.
  Existing controls: `fillNotice` in `hooks/settings/defaults.ts` names each set key and counts list entries per key.
  Response: mitigate.
  Actions: none open.
  Trigger: core's 2000-character warning on a claudetto notice.
  Owner: setup.
  Status: closed, verified 2026-11-19 (see Verified).

- [x] **RISK-498** A changed default or guard rule never reaches a user who already ran the fill.
  Verified: dogfood, claude 2.1.327, 2026-11-19: after 5c6c9e9b4 added the `git -C` rules, a fresh start left them out of the dogfood settings.json (grep count 0), because the store held the unchanged hand-bumped FILL_VERSION 6. After 5d697cca2 a restart wrote all four new rules (grep count 4); `claude plugin test plugins/claudetto`: 89 pass, 0 fail.
  Verified: 2026-11-24, claude 2.1.329, `claude plugin test .` in plugins/claudetto: 332 pass, 0 fail, including "fill version > changes when the filled text changes and is stable for one construction" and "settings fill at session start > does not fill again under the same fill version". The dogfood restart was not rerun.
  Category: Defect.
  Cause: the fill ran once per FILL_VERSION, a number a change had to bump by hand (#41).
  Event: a release ships a new deny or ask rule that existing installs never receive.
  Consequence: the user runs without a guard the release notes promise.
  Likelihood: 4 before the control, 1 after it.
  Impact: 4.
  Existing controls: FILL_VERSION is an FNV-1a hash of the filled text of empty settings (`hooks/settings/defaults.ts`), so any change to the defaults starts one new fill.
  Response: mitigate.
  Actions: none open.
  Trigger: a fill notice missing after a release that changes a default.
  Owner: setup.
  Status: closed, verified 2026-11-19 (see Verified).

- [x] **RISK-501** Commits lack the attribution line setup writes, because setup's own switch removed the attribution reminder.
  Category: setup.
  Cause: setup wrote `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS=1`. In 2.1.327 that switch (`BTt()`, chunk-m14bt1pz.js) removes both the Bash `# Git` block and the attribution reminder, so the `attribution` values setup also wrote never reached the model.
  Event: dogfood commits on 2.1.327 carried no `Assisted-by: Claude Code` line, and the transcript held no attribution reminder.
  Consequence: commits and pull requests lose the attribution the user's settings ask for.
  Likelihood: 4
  Impact: 2
  Existing controls: setup writes `includeGitInstructions: false` and no env switch. `hooks/git/instructions.ts` appends a shorter git block with the `attribution.commit` and `attribution.pr` lines read from settings, and adds no line for an unset value. claudetto's `includeGitInstructions` option (default true) turns the block off. When the env or a settings source turns the builtin block on, claudetto's block stays out and session start logs the conflict. `instructions.test.ts` pins each case.
  Response: mitigate.
  Actions: confirm the line on dogfood commits in the next run. In the session where the fill first writes `attribution`, the block has no attribution line, because settings are read back at the next start.
  Trigger: a commit or pull request without the configured attribution line.
  Owner: setup.
  Status: mitigated 2026-11-19 (issue #47).
  Verified: claude 2.1.327, 2026-11-19, `claude plugin test claudetto`: 115 pass, 0 fail. Live with `--plugin-dir`, the Bash description ends with the block and both lines. With `includeGitInstructions: true`, the builtin block stays alone and the conflict notice is logged. The first request is 45,426 bytes against 46,144 with the builtin block and reminder.
  Verified: claude 2.1.327, 2026-11-19: the filled commit line is now `Co-Authored-By: Claude <noreply@anthropic.com>` (ADR-0191), which GitHub credits to the `claude` account; cc-inspect cli with the filled settings shows the Bash description ending with that line. `claude plugin test plugins/claudetto`: 130 pass, 0 fail. The dogfood check of a real commit stays the open action.
  Verified: dogfood, claude 2.1.327, 2026-11-20, fresh clone at fea3d5562, isolated config whose settings held the retired `Assisted-by: Claude Code` commit value: session start printed "replaced attribution.commit Assisted-by: Claude Code", and the agent's commit d6b4451b0 ended with `Co-Authored-By: Claude <noreply@anthropic.com>` (git log -1 --format=%B); the side-branch commit in the same session carried it too (issue #47).
  Status: mitigated 2026-11-20 (issue #70): a commit scripted inside a larger task dropped the line, with the builtin block too. `hooks/git/trailer.ts` now refuses a Bash call whose inline commit message lacks the `attribution.commit` lines, and names the line to add. It applies only while claudetto's git block is the one sent. A failed settings or env read is logged and the call passes, so the shell guards' rewrite stays.
  Verified: replay 2026-11-20, claude 2.1.327, Sonnet 5.5, `claude -p`, reports/2026-11-20-research/commit-trailer: on the two-commit dogfood task, vanilla 0/16 commits carried the line, claudetto at 3e7e491de 0/16, claudetto with the guard 16/16; on a single commit request vanilla 0/8, claudetto 8/8; $2.44 in all. `claude plugin test plugins/claudetto`: 141 pass, 0 fail, twice.
  Verified: 2026-11-24, claude 2.1.329, `claude plugin test .` in plugins/claudetto: 332 pass, 0 fail, including "commit trailer guard > refuses a commit without the line before it runs and names the line to add" and "guard rules > sets one commit trailer that git hosts link to the claude account". The replay was not rerun: reports/2026-11-20-research/commit-trailer/run.sh needs the 2.1.327 binary and /private/tmp/claude-501/fin2/repo, both gone.
  Source: observed in a dogfood session on 2.1.327, 2026-11-19.

- [x] **RISK-513** A sandboxed command that needs a network host fails until the host is allowed for that command, because the sandbox denies every unlisted host: `bunx tsc --noEmit` fetching typescript from `registry.npmjs.org` (issue #78), `gh` reaching `api.github.com` (issue #81).
  Category: setup.
  Cause: REQ-SETUP-024 lists no `allowedDomains` and the fill writes none (`defaults.test.ts:39`), so on 2.1.327 only the hosts in a command's own `allowed_domains` are reachable. The plugins carry no local typescript, so `bunx` downloads it when its copy is missing or stale, and `gh` always calls `api.github.com`.
  Event: dogfood at be012dcdd, 2026-11-20, session 9c44572c: both tsc runs exited 1 on the denial; the agent re-ran them with `allowed_domains: ["registry.npmjs.org"]`, both exited 0, and it recorded the failed attempt.
  Consequence: one extra Bash call with a domain allowance; no wrong result.
  Likelihood: 2
  Impact: 1
  Existing controls: the denial names the host and how to allow it for one command.
  Response: accept.
  Actions: none. Allowing the registry for every command would widen the sandbox to save one call about once a day.
  Trigger: the agent reports a failure caused by a denial as a fault in the code, turns the sandbox off after one, or the denial appears in more than a quarter of sessions that run `bunx tsc` or `gh`.
  Owner: setup.
  Status: accepted 2026-11-20; Likelihood 2 × Impact 1 = 2.
  Verified: 2026-11-20, `grep -l 'deny network-outbound registry.npmjs.org'` over the 168 dogfood transcripts on this machine: 2 hits (4ccbdaa3 at 2026-11-19 00:06 UTC, 9c44572c at 2026-11-20 02:48 UTC) among the 20 sessions that ran `bunx tsc`; both reached exit 0 with the allowance. Session c3a85b2d ran the same command sandboxed minutes before the second hit and exited 0, and a sandboxed `bunx tsc --version` in the clone after the fetch exits 0.
  Status: accepted, widened 2026-11-20 (issue #81) to every unlisted host; Likelihood 2 × Impact 1 = 2. Listing `["*"]` would let any sandboxed command send data anywhere with no check, so it does not beat the one-call allowance.
  Verified: 2026-11-20, `deny network-outbound` over the 171 dogfood transcripts on this machine: 4 sessions, `registry.npmjs.org` 2 (4ccbdaa3, 9c44572c) and `api.github.com` 2 (69f630f9, d2ace84e); three recovered with one `allowed_domains` re-run, one through a later call, none with the sandbox off.
  Verified: 2026-11-20, issue #83: gh 2.104.0 also calls `cafe.github.com`, denied in 2 sessions (ba07e0d8 and the session driving the goal). `GH_TELEMETRY=log gh issue view 64 --json state` shows the payload is gh's telemetry (`command_invocation` with device ID, command, flags and agent); the command still exited 0 with its data, so the denial changes no result and keeps that data on the machine.
  Source: issues #78, #81 and #83.
