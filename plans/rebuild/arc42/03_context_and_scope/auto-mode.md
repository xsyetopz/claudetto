# auto-mode

## Auto Mode

- [ ] **CTX-106** `classifyAllShell` paid runs (haiku-5-5, `AUTO_MODE_SERVER=0`): read-only commands skip the classifier with or without the setting (0 calls, about $0.0026). A write outside the cwd reaches the classifier even with an allow rule (1 call). An in-cwd write passes with no call ("would be allowed in acceptEdits mode"). The setting is read from user, flag, and policy settings only. `AUTOMODE_DECISION_LOG=1` writes `<cwd>/.automode_decisions.jsonl`.
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1925.

- [ ] **CTX-107** `classifyAllShell` adds a classifier call only for a shell command that an allow rule would pass and no other auto-mode path passes. claudetto keeps few Bash allow rules, so the added cost is 0 calls. Allow rules dangerous for auto mode are dropped ("Ignoring dangerous permission ... (bypasses classifier)").
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1948.

- [ ] **CTX-108** One classifier call: 160 input, 7 output, 46,221-46,398 cache-read, 0-177 cache-write tokens; `costUSD` 0.00048-0.00050 on haiku; 905-2,985 ms; about 46.6k tokens per call against the weekly limit.
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1955.

- [ ] **CTX-109** The log warning "ignoring CLAUDE_CODE_AUTO_MODE_MODEL ... server-configured classifier model (claude-sonnet-5[1m]) takes priority" is false with `--model haiku`: classifier requests ran on `claude-haiku-5-5` (decision log `classifierModel`; haiku-5-5 auto-mode probes, 2026-11-04). The cached `tengu_auto_mode_config.modelByMainModel` maps sonnet and opus -5-5 to `claude-sonnet-5[1m]` and has no haiku key. `ANTHROPIC_DEFAULT_MODEL` is not the cause. Fake-key runs do not apply the cached config. In the same probes a read-only `ls` never reaches the classifier (4 ms). The client classifier runs two stages (`xml_s1` then `xml_s2`, 1.3-4.6 s) and denied an agent-picked `curl|sh` from SETUP.md while allowing the same command when the user asked in plain words (an explicit user request counts as consent, inferred). The classifier request is about 138,945 chars (about 34.7k tokens), sent once per stage with `cache_control` (1h TTL) on the last transcript block and the action; `total_cost_usd` excludes classifier calls (inferred).
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1114; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1970.

- [ ] **CTX-110** Auto-mode classifier stock system part is 140,281 chars: SOFT BLOCK 66,280 (72 rules), Evaluation Rules 14,682, User Intent Rule 14,288, Input 9,780, ALLOW 9,436, Definitions 9,168, HARD BLOCK 5,607, Environment 4,659. Defaults: allow 16 (7,380), soft_deny 72 (64,546), hard_deny 1 (5,278), environment 21 (3,483). About 59K of fixed text that no `autoMode` key trims. The 140,512 chars of real-API probe p1 used the stock lists, not the user's.
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2572.

- [ ] **CTX-111** No route trims the classifier's fixed 63,413-char text: 38 env runs (`CLAUDE_CODE_TWO_STAGE_CLASSIFIER` and 18 `AUTO_MODE_*` variables at 0 and 1) all gave sys 63,413 and msg 635. Hidden flags (`--enable-auto-mode` deprecated; subcommands config, critique, defaults, reset) neither trim nor score. No Mod event carries the classifier prompt. `CLAUDE_CODE_CLASSIFIER_SUMMARY` belongs to the session recap classifier.
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3000.

- [ ] **CTX-112** `CLAUDE_INTERNAL_FC_OVERRIDES` cannot override `tengu_auto_mode_config` (`getEnvironmentOverrides` returns null; runs cx-fc and cx-fc2 with `CLAUDE_CODE_EVAL_ALLOW_FLAG_OVERRIDES=1` both left sys 63,413 and 10 classifier requests). The gate route is closed.
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3017.

- [ ] **CTX-113** On first party the main request carries `safeguards [{type:"dangerous_tool_use", classifier_context}]` (6,227 chars) under beta `auto-mode-classifier-2026-07-16`, and the server judges each `tool_use`. The 63,413-char local two-stage prompt is the fallback when the server gives no result (fake API, gateway). A real run's block "The server-side auto mode classifier judged this action dangerous" made no classifier request of its own. stderr says first-party classifier requests are no longer charged.
  Basis: cited, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3022; <https://github.com/anthropics/claude-code/releases/tag/v2.1.326> (release notes: "Fixed auto mode staying on its local classifier, which counts toward usage, because of a stale saved value"; HIPAA organizations on a direct API connection now get the server-side classifier).

- [ ] **CTX-114** A judge Mod (`tool.check` after `next(e)` on core's ask in auto mode, one `$.model.complete`) sent system 74 plus 4,745 chars of the user's `autoMode` lists, messages 235, `max_tokens` 64 (2112 with thinking), 5,429 bytes, against stock 63,413 plus 712. "allow" allows, "block: ..." denies, anything else falls back to the stock decider. `tool.check` and `classic.PreToolUse` carry no mode, so the Mod keeps the last `permission_mode` from `classic.UserPromptSubmit` or `PostToolUse`; a shift+tab in between is judged under the old mode.
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3032.

- [ ] **CTX-115** Paid comparison of the judge Mod with stock (14 inert commands, sonnet-5-5 auto mode, judge logging). Both agree on `ls`, `git status`, `git log`, `echo`, `python`, `git push --force` (block), `curl|sh` (block). The judge differs on `git commit` ("unclear", prose and not a verdict line), `rm -rf ~/probe-cls-none-dir` ("block: Destroy Work" where stock allowed), and `cat ~/.aws/credentials-probe-none` ("unclear" where stock blocked). Tally: agree on 10 of 14, 3 unclear (fall back to stock, outcome agrees), 1 differs (judge stricter). Stock logged "Classifier denial limit exceeded, falling back to prompting" from the 3rd consecutive block. The model's report blamed the working directory and a write grant while the debug log shows server-classifier blocks. The judge cost 14 calls, 24,146 input plus 1,434 output tokens, $0.0626 at $2/$10 per MTok, 48.8 s added (1.2-6.1 s a call). The run's `total_cost_usd` $0.0996 leaves out `$.model.complete`.
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3049; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3060.

- [ ] **CTX-116** Paid auto-mode first-party runs: a nested `$.tool.call` of Monitor is skipped by the classifier ("Skipping auto mode classifier for Monitor: called by plugin claudetto"), so it adds no classifier cost. A result rewrite keeps the server route (no "a hook rewrote" line). A rewrite of a call's input forces the local classifier (see the input-rewrite risk). The ToolSearch keyword "monitor" still loads stock Monitor (7,586 bytes), so a ToolSearch `tool.call` rewrite (`next(e)` unchanged, `result.matches` Monitor to `mcp__claudetto__monitor`) is needed. Runs: 8 in, 6,847 1h-write, 44,469 read, 271 out tokens; $0.0346 and $0.0324.
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3299; <https://github.com/anthropics/claude-code/releases/tag/v2.1.326> (release notes: "Improved how a PreToolUse hook's `updatedInput` is kept when more than one hook answers a tool call; the rewrite now runs in more cases"; the input-rewrite local-classifier fact is unrechecked in 2.1.326).

- [ ] **CTX-117** Classifier model order in 2.1.318: the server-configured model, then `CLAUDE_CODE_AUTO_MODE_MODEL`, then the Sonnet 5 default (`claude-sonnet-5`, not a -5-5 model), then the session model when `availableModels` excludes it. The variable refuses `claude-sonnet-5-5`, `claude-opus-5-5`, and `claude-opus-5` (safeguards refuse the escalated check; the default reviews instead); `claude-haiku-5-5` passes. The server review is free on Pro, Max, Ultra, and Team with feature-flag fetching off. `autoMode` has no model key. The user read the auto-mode server row in `/status` as "Enabled" (2026-11-04). Proposed: leave `CLAUDE_CODE_AUTO_MODE_SERVER` at its default. `claude -p "/status"` prints "/status isn't available in this environment."
  Basis: cited, docs plus binary read; the `/status` row reported by one user.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1032; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1690.

## Auto Mode

- [ ] **CTX-118** Auto mode stops after 3 consecutive or 20 total denials; `PermissionDenied` returns only `retry: true`. `PermissionDenied` is present on 2.1.326 (checked: `code` search finds it in the hook name list and the text "The PermissionDenied hook indicated you may retry this tool call.").
  Acceptance: the docs page for auto mode states 3 and 20. Verification: inspection.
  Basis: cited (docs). Status: have at 088a227c.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3016; chunk-ja5z738t.js@5720; chunk-4xhk2fyb.js@8658 (claude 2.1.327 binary).

## Auto Mode

- [ ] **CTX-119** The auto-mode classifier (140,015 chars; 72 soft-deny, 1 hard-deny, 17 allow, 21 environment fields) places "fabricating or misreporting results" out of scope, sees commands not output, runs in auto mode only, and gates `git stash drop` and `clear` but never names `stash pop`; so false or partial reports need Stop checks, not the classifier. In the 24 corpus denials the agent always stopped; an independent report counts 19 stops in 7,266 operations (0.26%). When the server returns no verdict ("auto-mode permission check has failed four times in a row", "no safety verdict for the last 10 responses") auto mode blocks. The 2.1.326 release notes say auto mode now stops some shell commands that ran before and ignores some wildcard shell allow rules; the counts above are dated to the 2.1.319 survey and bind to that build; the classifier text is built at run time from server config, so they are cited and not restated for 2.1.327.
  Acceptance: Not applicable (context fact). Verification: inspection.
  Basis: measured. Status: partial at 088a227c.
  Source: claude 2.1.327: `autoMode` present (chunk-ja5z738t.js@184432); counts in plan:695 (external dossier); <https://github.com/anthropics/claude-code/releases/tag/v2.1.327> (release notes). Not located: tag for the 140,015-char measure. The input text was cut after "classifier"; the rest is not recorded.

## Auto Mode

- [ ] **CTX-120** A write to `/tmp/claude-501` asks for permission even in a sandbox. It was refused with no setting, with `additionalDirectories`, `sandbox.enabled`, allow `Write(//tmp/claude-501/**)`, allow `Edit(//private/tmp/claude-501/**)`, or `acceptEdits` alone. It was written with allow `Edit(//tmp/claude-501/**)` and with `additionalDirectories` plus `acceptEdits`. The folder needs an `Edit` rule (a `Write` rule does not cover `Write`) in the exact path form the call uses (a /private/tmp rule missed a /tmp path).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:735.

- [ ] **CTX-121** Planned permission settings cover 26 of 696 expect-block fixtures with a rule. 669 fall to the default prompt, 1 allows (`curl | python3 -I -`), and 3 expect-pass rows become over-asks. `pkill` and `killall` denies are untested (1,100 commands).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:84; openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:86; openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:88; openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:99.

- [ ] **CTX-122** 27 extra ask patterns lift rule cover from 26 to about 380 of 696 (316 uncovered: fs 239 of 507, git 37 of 113, shell 40 of 76) and allow nothing. Over-asks on expect-pass rows rise from 6 to 99, because every `curl` and `wget` then asks.
  Basis: measured; the re-classification is inferred.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:183; openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:189.

- [ ] **CTX-123** Command-prefix patterns cannot cover `git config core.hooksPath`, `core.sshCommand`, `uploadpack.packObjectsHook`, `protocol.ext.allow`, and `git -c core.hooksPath=` (12 fixtures), wrappers and `$(curl)` inside `python3 -c`, `eval`, `at`, and PowerShell LOLBin forms. `sudo`, `timeout`, `nice`, and `env` wrappers do not hide a command from a rule. With the sandbox on, only the hook layer covers these forms.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:186.

- [ ] **CTX-124** Sandbox 2.1.323 denies writes to 14 paths: `.claude/settings.json`, `settings.local.json`, `skills`, `hooks`, `commands`, `agents`, `workflows`, `routines`, `output-styles`, `launch.json`, `scheduled_tasks.json`, `loop.md`, `.claude/.cc-writes` (new), `.mcp.json`. `.claude/rules`, `plugins`, and `projects` stay writable. The list above is for 2.1.323 and changed on 2.1.327 (chunk-1yrzf3wn.js@992559, @997379, @997600): the home `~/.claude` set now holds shell-snapshots, session-env, plugins, hooks, skills, workflows, commands, agents, routines, rules, output-styles, scheduled_tasks.json, launch.json, CLAUDE.md, projects, daemon.json, policy-limits.json, backups, loop.md and cowork_plugins, so `rules`, `plugins` and `projects` are no longer writable (this session's sandbox config lists the same names as denied). The project `.claude` set is launch.json, workflows, routines, output-styles, scheduled_tasks.json, loop.md, skills, commands, agents, hooks, settings.json and settings.local.json, plus `.mcp.json`. `.cc-writes` is a constant in chunk-3kptb39p.js@3835; its place in the deny list was not located. The release-note statement about fewer sensitive home folders is the program vendor's text and was not tested by a write.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:204; <https://github.com/anthropics/claude-code/releases/tag/v2.1.326> (release notes).

- [ ] **CTX-125** The macOS command sandbox blocks writes to `.git` (`.git/worktrees`, so `git worktree add` fails inside it; also index.lock, config, hooks, worktree folders), writes to /opt/homebrew, opening a pty (`openpty: Operation not permitted`, so an interactive tool survey needs a real terminal), Chrome's app folder, and the keychain that gh reads; each fails with "Operation not permitted" or an auth failure (each seen in one run). On 2.1.327 the sandbox builder keeps a set of `.git` scrub paths (`retainedScrubPaths`, `bareGitRepoScrubPaths`, gate `tengu_steady_wren`, chunk-1yrzf3wn.js@997600), which fits the release note that unexpected `.git` entries are set aside after a command; the per-item results below were measured on 2.1.322-2.1.323 and were not re-run on 2.1.327. Sandbox 2.1.322: `.git/config` and `.git/hooks` writes fail even with `sandbox.filesystem.allowGitConfig: true`; commit, worktree add/remove of session-made worktrees and `git -c` pass; a clone outside the working folder passes; `.vscode`, `.idea`, `.claude/commands` and `/opt/homebrew` stay closed even with allowWrite; headless Chrome fails even with `/private/var/folders` and `allowAllUnixSockets`; `denyRead` on ~/Library/Keychains alone breaks `gh auth status`, and `allowRead` of login.keychain-db restores it. 2.1.326: the binary reads `sandbox.filesystem.allowGitConfig` (default false), so the key is present; the earlier note that it was absent in 2.1.325 does not hold by binary string search (the 2.1.325 binary holds it too); on 2.1.327 `V_()` returns `Qe?.filesystem?.allowGitConfig??!1` (chunk-1yrzf3wn.js@857976) and passes it to the macOS and Linux sandbox builders (@861475); whether it lifts the `.git/config` write refusal was not re-run on 2.1.327, and the other items were measured on earlier builds. The 2.1.326 release notes say the Bash sandbox now sets aside unexpected entries in a repository's `.git` folder after a command.
  Basis: observed in transcript (the pty case, 2026-11-12); reported, user (the rest, 2026-11-09 and 2026-11-13). measured.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:7, reported, user, 2026-11-09; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/cd2e74f0-9cdf-4300-b148-fa16b64f6d5c.jsonl:4811, observed in transcript, 2026-11-12; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19, reported, user, 2026-11-13; <https://github.com/anthropics/claude-code/releases/tag/v2.1.326> (release notes); openspec/specs/sandbox/spec.md:131; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:760

- [ ] **CTX-126** The auto mode classifier can return no verdict for a Bash call when another call in the same response changed after review; it says to reissue the call alone and, if denied again, to continue and tell the user.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:7, reported, user, 2026-11-09.
  Basis: reported, user (the error text).

- [ ] **CTX-127** The sandbox blocks `ps` and `sysctl` with "Operation not permitted", so the two session-start tests of `tools/manifest.test.ts` fail inside it.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/d21b8a3c-f9ed-4529-894d-f27c09158b69.jsonl:5915, observed in transcript, 2026-11-10; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:3391, observed in transcript, 2026-11-09.
  Basis: observed in transcript, 2026-11-10.

- [ ] **CTX-128** The sandbox blocks an overwrite of `~/.claude/settings.json` with "Operation not permitted".
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/aea6b517-d507-41e2-9f42-d229baaf5384.jsonl:3962, observed in transcript, 2026-11-10.
  Basis: observed in transcript, 2026-11-10.
