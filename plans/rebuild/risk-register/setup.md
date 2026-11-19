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

## Boundaries and Safety

- [x] **RISK-401** Sandbox escape by convenience: the agent turns the sandbox off for each EPERM.
  Verified: probe, claude 2.1.327, 2026-11-18, cc-inspect cli with the ADR-0188 block: routine Bash writes (under /opt/homebrew and /private/var/folders) ran with 0 prompts and no EPERM, so the agent meets no failure that tempts it to set dangerouslyDisableSandbox; the fill writes the block (defaults.test.ts).
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

## Environment, Accounts, and Marketplace

- [x] **RISK-405** Claude Code sends the claude.ai login token to a custom base URL.
  Status: closed. Cause is outside setup or outside claudetto (OUT-865, ADR-0190).
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
  - Actions: Tell the user to restart or reload after an update.
  - Trigger: A release lands during a session.
  - Owner: setup
  - Status: open (Existing controls: partial at 088a227c).
  - Source: observed in transcript, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1241).
  Status: closed: outside claudetto (OUT-866, ADR-0190), as the first Status line says.

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
  - Actions: Tell the user to rerun the setup command after the update.
  - Trigger: A retired key is in the user settings.
  - Owner: setup
  - Status: open (Existing controls: have at 088a227c).
  - Source: observed in transcript, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1241).
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

## Conduct Faults from the Rearchitecture Sessions

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
  Status: open.
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

- [x] **RISK-493** The first-run settings notice is cut off on the terminal.
  Verified: dogfood, claude 2.1.327, 2026-11-19: a fresh config dir drew core's warning `$.ui.log: a text (3163 characters) is drawn up to its first 2000 on the terminal`; after the fix, the test "counts list entries per key so a first fill fits the 2000 characters the terminal draws" passes (72 of 72 in `claude plugin test`). The notice names keys by full path (`permissions.deny`, `sandbox.filesystem.allowWrite`) since c286bcb81, because the dogfood showed bare `deny` and `sandbox` labels. The `⚠ claudetto:` prefix on the line is core’s: a minimal plugin `stp` whose hook logs "plain line" drew `⚠ stp: stp: plain line` on 2.1.327 (dogfood probe, 2026-11-19), so claudetto cannot drop it and keeps the notice text plain.
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
  Source: observed in a dogfood session on 2.1.327, 2026-11-19.
