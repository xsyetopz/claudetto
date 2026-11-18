# mods

## Mods And Lab Tooling

- [ ] **CTX-219** A Monitor rebuilt as `mcp__claudetto__monitor` (Bash through `$.tool.call` `run_in_background:true`, polling the output file every 200 ms), measured on claude 2.1.318: hooks modules are not loaded until workspace trust is accepted; `$.session.send` needs `{to, text}` and refuses its own session id and "main"; `$.prompt.submit` runs once idle, so events arrive after the turn ends, while stock Monitor delivers inside the running turn. Per event: stock 620 chars, Mod 380 chars. `mt1` trimmed stock Monitor to 1,960 bytes (description 845, schema 1,040, -74%); `mt2` Mod tool 792 bytes (description 495, schema 209) against 7,586 stock. Losses: no in-turn delivery, user-turn framing, no ws source, 100-message cap.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2730.

- [ ] **CTX-220** A second `tool.call` handler that appends queued events to the next tool result's context delivers them inside the running turn (request 2749: "tool.call hook additional context: [monitor: probe events] ev1 / ev2"). A blank line needs filtering (an empty third event). 2 events fit in 240 chars.
  Basis: measured, claude 2.1.318, retry mon14/mon15.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2770.

- [ ] **CTX-221** Monitor replacement costs driven to 0 (mon16-mon20): the stock completion notice of the background Bash (931 chars) is dropped via `prompt.submit` `origin.kind` "task-notification" with the monitor's own task id (answer: drop). Events after the last tool call go out by `$.prompt.submit` at `turn.complete` or idle; a turn-end window was forced with `DELAY_FINAL=4000`, with a busy flag from `turn.start` and `turn.complete`. Remaining losses: user-turn framing, no ws source, no 100-message cap.
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2781.

- [ ] **CTX-222** The `$.prompt.submit` frame is fixed in code ("The <name> plugin sent a message: ... starts this turn in the user's place" when idle, "while you were working" mid-turn); only the other form `asUser` reads as the user's own words. An idle `isMeta` prompt takes no rewrite. `$.session.append` writes a meta row but starts no turn. Stock Monitor rate stop: a token bucket of 10 events, refill 2000 ms, kill after 30000 ms of suppression ("[Monitor stopped - too much output ..."). The ws source is the `ws {url, protocols}` field.
  Basis: cited, claude 2.1.318 source read.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3266.

- [ ] **CTX-223** Monitor wrapper (mon21-mon31): a claudetto `monitor` tool that calls the stock Monitor through `$.tool.call`, with stock Monitor kept deferred and guarded by a `tool.call` guard ("Monitor is off here: call mcp__claudetto__monitor."), gives stock delivery in a running turn and idle, the stock frame, ws source frames, and the stock rate stop (mon25: 150 lines at 300 ms, 26 reached the model, "[Monitor stopped - too much output (5 events suppressed over 30s)"). Loaded bytes 866 against 7,586 stock and 1,960 trimmed. Per event 620 chars (the stock frame, not the old Mod's 380).
  Basis: measured, claude 2.1.318. The decision is in the Monitor wrapper record.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3271; https://github.com/anthropics/claude-code/releases/tag/v2.1.326 (release notes: "Improved Monitor: when a watch expires with no events and its command wrote to stderr, Claude is now told so and told which file holds the output").

- [ ] **CTX-224** A trimmed ListAgents keeps the tool: a 304-char text takes it from 1,151 to 674 bytes (-41%). ListAgents cannot be rebuilt on `$.agent.list` (it omits local, cloud, and Remote Control sessions). The engine takes an undeclared Agent `name` (`registerName`) and stock models pass it unprompted. Paid, 5 runs $0.3810: stock $0.1031 (84,753 tokens) against mod2 $0.1244 (71,110 tokens), with more cache writes (19,892 against 12,069).
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2818.

## Mods And Lab Tooling

- [ ] **CTX-225** Mod worker limits (claude 2.1.318): no `process` global (ReferenceError "process is not defined"); `$.session.cwd()` answered only at shutdown ("no session bound"); `$.env.get("HOME"/"CLAUDE_CONFIG_DIR")` works; sequential `$.fs.exists` calls on missing paths stalled the hook (cause not isolated), parallel calls work (a relative `exists` miss gives false, list or read misses reject ENOENT); the loader refuses a `$` passed to anything but a top-level function. Probe `setmod3` lists the four skills and commands dirs in parallel once. Workflow text goes from 3,480 to 20,256 chars with `workflow-authoring` off.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3171.

## Mods And Lab Tooling

- [ ] **CTX-226** The baseline lab at commit `62e2fe96` on Claude Code `2.1.318` (`claude plugin test /tmp/claudetto-baseline/plugins/claudetto`) ran 357 tests across 46 files with 0 failing
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/parity.md:3.

## Mods And Lab Tooling

- [ ] **CTX-227** On 2.1.323 (observed) and 2.1.326 (names re-listed on 2026-11-17): `prompt.compose` sees `e.model`, replaces the whole default body per model (not the billing line, identity line or system-role message), has sections of scope `shared`, one shared section `lean_body` on a lean model, and does not reach a built-in or plugin-agent subagent; a plugin agent body replaces the default text and the engine appends about 1,294 bytes; `tool.list` removes tools for main and subagents (`next(e)` returns `{ value: ToolInfo[] }`; 22 tools, 3 removed, 73.9 ms); `agent.spawn` rewrites subagent `model` and `prompt`; no classic hook input carries `model`; `PreToolUse` carries `effort.level`; `engines["claude-code"]` refuses install from a git or remote source; default `system[2]` is 5,893 bytes (Opus), 5,630 (Sonnet), 8,471 (Haiku); tool schemas are about 28.6 KB; no settings key sets the prompt; an agent file body replaces the default (304 vs 6,274 bytes on Opus 5.5); an output style lands in the environment message and does not reach subagents; `SessionStart` `model` is absent under `-p`; default system sizes are Opus 5.5 6,274 B, Haiku 5.5 8,862 B, tools 29,666 B. On 2.1.326 these names are present: `prompt.compose`, `tool.list`, `agent.spawn`, `tool.describe`, `settings.read`, `$.model.fork`, `$.tool.register`, `$.tool.call`, `$.ui.*`, `$.fs.*`, `$.env.get`, `$.process.*` (253 mod-api names in 2.1.326; 239 were listed on 2.1.325).
  Acceptance: each name is listed by `surface` on 2.1.326. Verification: probe.
  Basis: measured. Status: have at 088a227c (`features/prompt/compose.test.ts:7` holds `lean_body`; `features/prompt/texts.ts:123` maps Opus 5.5 to it).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:17; openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:235; openspec/changes/archive/2026-11-16-2-1-323/specs/model-prompts/spec.md:5; plugins/claudetto/hooks/features/prompt/texts.ts:123@088a227c. Not located: the 239-name list and the `engines` refusal line.

- [ ] **CTX-228** On 2.1.325 (not rerun on 2.1.326; the 2.1.326 release notes say mods can again use Bash, Read and other tools through `$.tool.call` and `$.tool.check` in Code Mode) a mod's `$.tool.call` opens no permission prompt (since 2.1.321); `ENABLE_TOOL_SEARCH` unset already defers MCP tools, also behind a custom base URL since 2.1.304; `$.env.get` sees keys in settings env; `--plugin-dir` logs that it overrides the installed version; the trust dialog defaults to "No, exit" and typing before it exits at no cost; the baseline sent 12 tools and 6,174 system bytes, dev 8 tools and 8,955 bytes against stock 28,937. 2.1.326 offers `$.model.fork`, `tool.list`, `settings.read`, the setting keys `disableWorkflows` and `outputStyle` (cc-inspect `surface` mod-api and setting lists, 2026-11-17); on 2.1.327 `$.tool.call`, `$.tool.check`, `$.env.get` and `$.http.fetch` are mod calls (cc-inspect `surface` mod-api, 2026-11-18). The prompt, trust-dialog, tool-search and byte-count lines are measurements dated 2.1.325 and are not restated for 2.1.327.
  Acceptance: the fake-API probe reproduces each line. Verification: probe.
  Basis: measured. Status: have at 088a227c.
  Source: openspec/changes/2-1-325-rearchitecture/design.md:136; openspec/changes/2-1-325-rearchitecture/design.md:162; openspec/specs/prompt-cache/spec.md:66; openspec/changes/2-1-325-rearchitecture/proposal.md; <https://github.com/anthropics/claude-code/releases/tag/v2.1.326> (release notes).

- [ ] **CTX-229** Stock Claude Code shows "[claudeai-mcp] Fetched 2 servers" (Claude Docs, alphaXiv); `disableClaudeAiConnectors` gives "Disabled via ... setting"; trim scalars cut bundled skills from 31 to 2; `disableWorkflows` also stops the +16.8k-char Workflow inflation. Both settings are present on 2.1.326 (cc-inspect `surface` setting list, 2026-11-17).
  Acceptance: a `-p` run with each scalar shows the stated line or count. Verification: probe.
  Basis: measured. Status: have at 088a227c (`surface/trim.ts`).
  Source: openspec/changes/2-1-325-rearchitecture/design.md:84; plugins/claudetto/hooks/features/surface/trim.ts:3-7@088a227c. Not located: the 31-to-2 and +16.8k lines.

- [ ] **CTX-230** The `settings.read` hook (measured on 2.1.318-2.1.319): in `-p` it changed 1 of 7 tier keys (`disableBundledSkills`); interactive it also changed `outputStyle`; `skillOverrides` also changed (a skill listing shrinks from 6,183 to 493 bytes with `skillOverrides`, and a refused call makes 0 requests); `model`, `effortLevel`, `permissions`, `env`, `enabledPlugins` kept file values; `model`, `effortLevel`, `modelSettings` are read once at session start (docs); the engine does not wait for the hook before request 1 (hooks of 38.7 ms or less won 47 of 47, 66.7-90.6 ms lost 10 of 11; a later report gives the same counts for claude 2.1.325 (timing counts, dated and not restated for 2.1.327), so a setting that rides this race needs a fast hook); a plugin-root `settings.json` carries `subagentStatusLine` but drops `sandbox`. `settings.read` and the setting keys `effortLevel`, `skillOverrides`, `disableBundledSkills`, and `outputStyle` are present on 2.1.326 (cc-inspect `surface` mod-api and setting lists, 2026-11-17).
  Acceptance: the probe reproduces the 47-of-47 and 10-of-11 race counts. Verification: probe.
  Basis: measured. Status: have at 088a227c.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3372; cc-inspect `surface`, claude 2.1.326, 2026-11-17. Not located: the 1-of-7 line, and a source line for the skillOverrides byte counts and the 2.1.325 race report.

- [ ] **CTX-231** On a fake login `/fast` answers "Fast mode is not available"; 260 one-pixel images in `claude -p` were never dropped and kept the prefix.
  Acceptance: the fake-API run repeats both lines. Verification: probe.
  Basis: measured; the old plan marks it unverified. Status: have at 088a227c.
  Source: openspec/specs/prompt-cache/spec.md:114.

## Mods And Lab Tooling

- [ ] **CTX-232** A usage-cap mod, reported by one author (MIT repo), holds these facts. A plan with no 5-hour window has that window missing from the usage data, which is not 0 percent used. The weekly percent is a whole number and one point is many tokens on Ultra, so the mod estimates between points from token counts and learns the tokens-per-point ratio. Polled usage after idle counts as fresh only when its values change. At the cap it refuses new prompts and subagents but leaves running turns and tool calls alone, and background task notifications always get through, since blocking them breaks agents. If usage is unreadable it shows a warning and lets calls through, or blocks them when set to fail closed. The 15-percent-of-weekly default is the author's least sure part.
  Acceptance: The facts hold as one author reports them. Verification: probe.
  Basis: reported, one author. Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-11-02/reddit.com-r-anthropic-comments-1xkzigh-made-a-mod-that-caps-my-own-cla-20261101T191520Z.md:29; external/2026-11-02/reddit.com-r-anthropic-comments-1xkzigh-made-a-mod-that-caps-my-own-cla-20261101T191520Z.md:33; external/2026-11-02/reddit.com-r-anthropic-comments-1xkzigh-made-a-mod-that-caps-my-own-cla-20261101T191520Z.md:35; external/2026-11-02/reddit.com-r-anthropic-comments-1xkzigh-made-a-mod-that-caps-my-own-cla-20261101T191520Z.md:37; external/2026-11-02/reddit.com-r-anthropic-comments-1xkzigh-made-a-mod-that-caps-my-own-cla-20261101T191520Z.md:39; external/2026-11-02/reddit.com-r-anthropic-comments-1xkzigh-made-a-mod-that-caps-my-own-cla-20261101T191520Z.md:43 (url: <https://www.reddit.com/r/Anthropic/comments/1xkzigh/made_a_mod_that_caps_my_own_claude_code_usage_in/>).

## Mods And Lab Tooling

- [ ] **CTX-233** claudetto shall rely on these measured facts: the lab loads `*.test.ts` only inside the plugin folder; `claude plugin validate`/`test` do not write `.claude-plugin/types` while a print run with `CLAUDE_CODE_PLUGIN_DIR_WATCH=1` does (2.1.319; env present in 2.1.326, binary string search: 6 hits); a lab test asserting `undefined` equals `undefined` passed and only `bun check` flagged it; baseline 62e2fe96 (2.1.318, Bun 1.4.4) held 23,266 lines in plugins/claudetto/src (16,079 non-test), 23 blocks, 20 userConfig keys, a 4,677-line gate with 27 spec tests, 1,257 you-should-know source lines; `test` 1,776 pass, 7 fail, 2 errors from confine limits (mkdtemp EPERM, pty/tmux).
  Acceptance: Each figure is reproduced from its run before use. Verification: probe.
  Basis: measured. Status: have at 088a227c (tests/, tools/).
  Source: openspec/specs/mod-architecture/spec.md:107; openspec/specs/mod-architecture/spec.md:28; openspec/changes/2-1-325-rearchitecture/items.json:114; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:8.

## Mods And Lab Tooling

- [ ] **CTX-234** claudetto shall record these measured bench rounds (9 tasks, Opus 5.5, auto mode): R2 stock 8/8 $4.16 vs dev 6/7 $5.07; R3 stock 8/9 $4.18 4.85M tokens vs dev 7/9 $6.79 9.31M; R4 stock 8/9 $4.02 vs dev 7/9 $5.73 6.20M (dedupe cut 33% tokens); R5 stock 8/9 $3.98 4.36M vs dev 9/9 $9.10 12.22M regraded; conduct: reply opens with fact stock 6-7/9 vs dev 9/9, seeded claim never acted on 9/9 both, 0 compactions, 0 subagents; round costs $10.97, $9.75, $13.08.
  Acceptance: History only; the settled decision "No benchmarks" (user decision, 2026-11-16) bars new rounds. Verification: inspection.
  Basis: measured. Status: unchecked: a measured result, not code at 088a227c.
  Source: openspec/changes/2-1-325-rearchitecture/design.md:238; openspec/changes/2-1-325-rearchitecture/design.md:29; openspec/changes/2-1-325-rearchitecture/design.md:250.

## Mods And Lab Tooling

- [ ] **CTX-235** `$.command.run` runs a slash command as if typed, queued until idle, and rejects inside a hook the turn waits on; hooks see `e.origin` `{kind:'plugin'}`. `$.prompt.submit` submits a prompt as its own turn once idle. `$.session.compact` compacts between turns with trigger `plugin`.
  Acceptance: the types in clawdipedia `get_schema` `types` match. Verification: inspection.
  Basis: cited. Status: have.
  Source: clawdipedia docs `get_schema` types (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5807).

- [ ] **CTX-236** Subagents default to a 5 min cache TTL; the allowlist for the longer TTL is `repl_main_thread*`, `sdk`, `auto_mode`, `memdir_relevance` (2.1.327: allowlist `QSt` at chunk-m14bt1pz.js@2564092, 5 min default at chunk-m14bt1pz.js@3210453; 2.1.325: `rNe`, `chunk-wqb2b4v0.js:3067022`, precedence in `cIn`, `:2438231`).
  Acceptance: the code at the offsets matches. Verification: inspection.
  Basis: measured. Status: have.
  Source: chunk-m14bt1pz.js@2564092 and @3210453 (claude 2.1.327 binary, read 2026-11-18); `chunk-wqb2b4v0.js:3067022` (claude 2.1.325 binary) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5807).

- [ ] **CTX-237** Tool names are case-sensitive: a call to `bash` fails with "No such tool available"; `Bash` works.
  Acceptance: the error text reproduces. Verification: demonstration.
  Basis: reported. Status: have.
  Source: reported, user, 2026-11-16 18:24 UTC, tool names keep their case, `Bash` not `bash` (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5608).

## Mods And Lab Tooling

- [ ] **CTX-238** `$.model.fork({prompt, effort})` runs one tool-less completion over the main thread's last request with the prefix from cache; it returns `isAnswered`, `text`, `usage`, or `reason:'nothing-to-fork'` when no turn ran since a clear or resume. Hook time stops during `$` calls and the hook's own budget is 10 s; `session.end` hooks share 1.5 s; `prompt.context` fires once per conversation and answers `{blocks:[{name,text}]}`.
  Acceptance: the docs pages match. Verification: inspection.
  Basis: cited. Status: have.
  Source: clawdipedia mod-api pages, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6738).

- [ ] **CTX-239** `$.env.get` returns a promise and needs a literal name; `$.settings.read()` returns custom keys; `$.ui.log` goes to stdout, which the cli output truncates.
  Acceptance: probe C reproduces. Verification: probe.
  Basis: measured. Status: have.
  Source: probe C, `claude` 2.1.325, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6738); (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:7297); (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:8057).

- [ ] **CTX-850** The official mods overview, read 2026-11-18, says the following:
  - Mods are on by default from Claude Code v2.1.287 in the terminal and from v2.1.286 in the Desktop app.
  - Claude Code ignores the early-access variable `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS`.
  - A mod can restyle much of the interface, but not the permission prompt.
  The page never uses the word "stable" and says nothing about a sidebar. Two commenters call mods stable and encouraged; that matches the on-by-default statement. Their sidebar claim stays reported only.
  Acceptance: plan text calls mods on by default since v2.1.287, cites this page, and does not call them stable. Verification: inspection.
  Basis: cited (official docs page); reported (sidebar). Status: n/a (Claude Code behaviour).
  Source: <https://code.claude.com/docs/en/plugins/mods/overview> (read through the clawdipedia-docs `code` source, 2026-11-18); external/2026-11-18/reddit.com-r-claudecode-comments-1xypgto-context-bar-mod-for-claude-cod-20261117T224722Z.md:63-71 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xypgto/context_bar_mod_for_claude_code_desktop_app/>); reports/2026-11-18-research/dossier.md:191.
