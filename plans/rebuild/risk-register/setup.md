# Setup Risks

## Setup

- [x] **RISK-394** A name-keyed `skillOverrides` Mod takes a user's own skill out of the listing.
  Verified: grep, claude 2.1.327, 2026-11-18, `grep -rnE "skillOverrides|settings.read|OFF_SKILLS" plugins/claudetto --exclude-dir=types`: 0 hits; the `skillOverrides` hook went out with REQ-SETUP-002.
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
  Response: avoid.
  Actions: Keep the variable out of the written env set; a setup test pins its absence.
  Trigger: A setup change adds `CLAUDE_CODE_SCRIPT_CAPS` or `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB`.
  Owner: setup. Status: Open.
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

- [ ] **RISK-398** Sandbox blocks `git worktree add`.
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
  - Status: open
  - Source: openspec/changes/archive/2026-11-16-2-1-323/research/issues-2026-11-09.md:21 (unknown cause).

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

## Boundaries And Safety

- [ ] **RISK-401** Sandbox escape by convenience: the agent turns the sandbox off for each EPERM.
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

## Context Loss And Handover

- [x] **RISK-402** An earlier plugin default of `cleanupPeriodDays: 14` deleted transcripts.
  Verified: grep, claude 2.1.327, 2026-11-18, `grep -rn cleanupPeriodDays plugins/claudetto --exclude-dir=types`: 0 hits; nothing writes a retention value, so the Claude Code default (30) stands.
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

- [ ] **RISK-403** Agent narrows a general fix to the one tool that showed the fault.
  - Category: Conduct
  - Cause: The agent finds the sandbox proxy fault on Java and searches only Java proxy settings.
  - Event: The user interrupts: the fix must serve every tool.
  - Consequence: A one-tool fix and a correction turn.
  - Likelihood: 2
  - Impact: 2
  - Existing controls: None found.
  - Response: mitigate
  - Actions: State the general cause first and fix it for every tool of that class.
  - Trigger: A fix named after one tool for a fault in a shared layer.
  - Owner: setup
  - Status: open.
  - Source: observed in transcript, 2026-11-13; reported, user, 2026-11-13; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:14535.

- [x] **RISK-404** A claudetto MCP tool disconnects in a session.
  Verified: grep, claude 2.1.327, 2026-11-18, `grep -rn "mcp__claudetto" plugins/claudetto --exclude-dir=types`: 0 hits and plugins/claudetto holds no MCP server, so the tool cannot disconnect.
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

## Environment, Accounts, And Marketplace

- [ ] **RISK-405** Claude Code sends the claude.ai login token to a custom base URL.
  Category: product behaviour.
  Cause: ANTHROPIC_BASE_URL is set with no ANTHROPIC_AUTH_TOKEN.
  Event: Claude Code can send the login token to the custom URL.
  Consequence: the login token leaks to the URL's server.
  Likelihood: 1. Impact: 5.
  Existing controls: none at 088a227c. A fake-API probe on 2.1.327 (`code cli`, login oauth, no ANTHROPIC_AUTH_TOKEN, 2026-11-18) ran, but the report does not expose request headers, so whether the login token reaches the base URL is open; a probe needs request-header capture.
  Response: avoid.
  Actions: always set a dummy ANTHROPIC_AUTH_TOKEN beside ANTHROPIC_BASE_URL. The same setup names ANTHROPIC_MODEL (line 103).
  Trigger: ANTHROPIC_BASE_URL in an environment with no ANTHROPIC_AUTH_TOKEN.
  Owner: setup.
  Status: Open.
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

## Product And Tooling

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

- [ ] **RISK-410** A running session holds a stale plugin until restart.
  - Category: product.
  - Cause: Claude Code loads a plugin at start.
  - Event: A fixed rule does not reach a running session.
  - Consequence: The user still sees the fault.
  - Likelihood: 4
  - Impact: 2
  - Existing controls: none.
  - Response: mitigate.
  - Actions: Tell the user to restart or reload after an update.
  - Trigger: A release lands during a session.
  - Owner: setup
  - Status: open (Existing controls: partial at 088a227c).
  - Source: observed in transcript, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1241).

- [ ] **RISK-411** The user's settings keep the retired _TEXT key.
  - Category: product.
  - Cause: The sandbox denies a write to the user's settings.json.
  - Event: The old narration text stays.
  - Consequence: Narration continues until setup reruns.
  - Likelihood: 3
  - Impact: 2
  - Existing controls: A setup rerun removes it.
  - Response: mitigate.
  - Actions: Tell the user to rerun the setup command after the update.
  - Trigger: A retired key is in the user settings.
  - Owner: setup
  - Status: open (Existing controls: have at 088a227c).
  - Source: observed in transcript, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1241).

## Claude Code Faults

- [ ] **RISK-412** The auto-mode classifier gives no verdict on a Bash call.
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
  Status: open.
  Source: observed in transcript, 2026-11-16: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:2677 (handoff, Bash classifier outages); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:4092 (round 2 dev arm).

## Conduct Faults From the Rearchitecture Sessions

- [ ] **RISK-413** The agent edits user settings or reverts work with no order.
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
  Status: open.
  Source: reported, user, 2026-11-13 22:21 UTC, nobody asked for a revert (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:15664): ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37070.

- [ ] **RISK-414** Setup is slow and the sandbox and hooks cause friction and error noise.
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
  Status: open.
  Source: reported, user, 2026-11-13 22:08 UTC, sandbox trimmed to unrecoverable destructive commands (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:14708); reported, user, 2026-11-14 14:21 UTC, sandbox as minimal as possible (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:36547): ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37070.

- [x] **RISK-415** A plugin secret or settings placeholder leaks into the user settings.
  Verified: grep, claude 2.1.327, 2026-11-18, `grep -rln "CONTEXT7" plugins/claudetto`: 0 hits; no plugin code writes the key, so the placeholder cannot come from it.
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
