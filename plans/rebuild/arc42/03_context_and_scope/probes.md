# Probes

## Probes and Experiments

- [ ] **CTX-348** Handoff tail defect probes A/B/C: the fork missed the newest tool steps; the fix lists the last three tool-using assistant steps.
  Acceptance: Probe A $0.6545, B $0.6343, C $0.6411; counts 380/412/385 equal truth; handoff "data1 done, data2 done, data3 read only", 3 commits, 11 turns, 48.8 s. Verification: probe.
  Basis: measured.
  Status: have at 088a227c (the tail lists the last three tool-using steps).
  Source: openspec/changes/2-1-325-rearchitecture/design.md:62.

- [ ] **CTX-349** Bench round 1: the first request cached 11,161 tokens across sessions in the stock arm and 5,821 or 0 in the dev arm; the cause is the stock system[2] varying paragraph while dev prefixes stay byte-identical (16,333 bytes). Cache hit means prefix reuse: read_n over (read + creation)_(n-1), not the share of input; two dev sessions send byte-identical prefixes, so the cross-session prefix of 5,821 tokens against 11,161 is no cache break.
  Acceptance: Write tokens 138,952 (stock) against 170,179 (dev); both arms write only the 1-hour cache in real runs; stock sends 12 tools (28,937 bytes) and dev 8 (8,955 bytes) beside a 7.2 KB system prompt each; the 0 reads were two dev runs launched together. Verification: probe. A body dump from the fake API matches. Verification: probe.
  Basis: measured.
  Status: n/a (fact).
  Source: openspec/changes/2-1-325-rearchitecture/design.md:136; probe `probe-prefix`, fake API with body dump, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:2031); (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:1281).

## Probes and Experiments

- [ ] **CTX-350** The old plugin made 2 side calls on a plain typed prompt, 3 on one Bash turn (the sonnet grade runs when tool results exist), 5 on a foreign-branch force-delete; grade timeout 15 s, Decider timeout 20 s.
  Acceptance: a ledger of one session shows those counts. Verification: probe.
  Basis: measured. Status: have at 088a227c (the grader is gone; history).
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:924 (1 haiku call plus 1 sonnet call when tool results exist). Not located: the 5-call and timeout lines.

## Probes and Experiments

- [ ] **CTX-351** `$.command.run({command:'clear'})` called unawaited at main-loop `turn.complete` clears the session: `first one` appears only in request 1, the session id changes, and `session.end` fires with `{reason:"clear", sessionId:<old id>}`. A typed `/clear` has origin `{"kind":"composer"}` and the plugin's has `{"kind":"plugin"}`; after the clear `session.start` does not fire; an unawaited `$.command.run({command:'clear'})` followed by `$.prompt.submit({text, asUser:true})` puts the handoff text only in request 2, headless (probe, fake API, claude 2.1.325); `$.fs.write` has no append option.
  Acceptance: the probe log shows `CR clear {"kind":"plugin","name":"probe"}` and `SE clear <old id>`. Verification: probe.
  Basis: measured.
  Source: session-cycle probe, claude 2.1.325, 2026-11-16, cc-inspect cli with a --plugin-dir module, one stream-json prompt (recorded in plans/rebuild-curation.md at commit dc499712); probe, `claude` 2.1.325, fake API, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6352).

- [ ] **CTX-352** `$.prompt.submit({text, asUser:true})` after the clear delivers `text` as the first user content of request 2, bare; without `asUser` it arrives framed as "The probe plugin sent a message".
  Basis: measured.
  Source: session-cycle probe, claude 2.1.325, 2026-11-16, cc-inspect cli with a --plugin-dir module, one stream-json prompt (recorded in plans/rebuild-curation.md at commit dc499712).

- [ ] **CTX-353** A clear issued while another prompt is queued rejects with "HooksError: the command was removed from the queue before it ran". The text "the prompt was removed from the queue before it ran" is present in 2.1.327 (chunk-m14bt1pz.js@1005617), and the command path in 2.1.327 reads "the command was removed from the queue before it ran" (chunk-m14bt1pz.js@5989824), so the exact message matches there.
  Basis: measured.
  Source: session-cycle probe, claude 2.1.325, 2026-11-16, cc-inspect cli with a --plugin-dir module, one stream-json prompt (recorded in plans/rebuild-curation.md at commit dc499712).

- [ ] **CTX-354** `session.start` does not fire after a clear.
  Basis: measured.
  Source: session-cycle probe, claude 2.1.325, 2026-11-16, cc-inspect cli with a --plugin-dir module, one stream-json prompt (recorded in plans/rebuild-curation.md at commit dc499712).

- [ ] **CTX-355** `$.session.compact()` in a headless (`-p`, SDK) session rejects with "not available in a headless (-p / SDK) session yet" (the same text is present in 2.1.327: chunk-m14bt1pz.js@63563).
  Basis: measured.
  Source: session-cycle probe, claude 2.1.325, 2026-11-16, cc-inspect cli with a --plugin-dir module, one stream-json prompt (recorded in plans/rebuild-curation.md at commit dc499712).

- [ ] **CTX-356** `$.session.compact()` called unawaited at `turn.complete` in the interactive TUI runs; the `session.compact` hook receives `{trigger:"plugin", messages:[...]}`; the answer `{messages:[handoff]}` becomes request 2 (`HANDOFF MSG` plus the next prompt, no earlier text); the transcript file and so the session id are kept; no summary request is sent. The debug log then reads "session.compact (plugin): a hook's 1 messages stand ... core never ran", the next request carries "Context was reset from the handoff below...", and "every hook but the calling one" means the calling hook function, not its module (interactive probe, 2026-11-16).
  Acceptance: the interactive probe `run-il6h87` shows the log line and the next request text. Verification: probe.
  Basis: measured.
  Source: session-cycle probe, claude 2.1.325, 2026-11-16, interactive TUI on a fake API stub (recorded in plans/rebuild-curation.md at commit dc499712); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:2677.

- [ ] **CTX-357** A `session.compact` hook answering `{messages:[handoff]}` on a typed `/compact` puts the handoff, not the history, in request 2; the session id is kept.
  Basis: measured.
  Source: session-cycle probe, claude 2.1.325, 2026-11-16, interactive TUI on a fake API stub (recorded in plans/rebuild-curation.md at commit dc499712).

- [ ] **CTX-358** The `command.run` origin is `{kind:"plugin", name}` for a plugin call, `{kind:"sdk"}` for a command typed in stream-json, and `{kind:"composer"}` for a command typed in the TUI (interactive run); a typed `/clear` starts a new transcript.
  Basis: measured.
  Source: session-cycle probe, claude 2.1.325, 2026-11-16, interactive TUI on a fake API stub (recorded in plans/rebuild-curation.md at commit dc499712).

- [ ] **CTX-359** `$.fs.write` has no append option: a call with `{append:true}` overwrote the file. A log must be kept as an array and written whole.
  Basis: measured.
  Source: lead probe, claude 2.1.325, 2026-11-16, `$.fs.write` with `{append:true}` (recorded in plans/rebuild-curation.md at commit dc499712).

## Probes and Experiments

- [ ] **CTX-360** A `command.run` hook on `{command:'clear'}` that awaits `$.model.fork`, stores the text, and returns `next(e)`, with a `prompt.context` block `probe:handover`, produces 3 requests: the fork is request 2 and holds `first one`; request 3 opens with `# probe:handover` plus the handover and holds no `first one`; cache_control sits on `messages[1].content[0]` in request 1 and `messages[2].content[0]` in the fork.
  Basis: measured.
  Source: handover probe A, claude 2.1.325, 2026-11-16, cc-inspect cli on a fake API, stream-json prompts `first one`, `/clear`, `after clear`, plugin under --plugin-dir (recorded in plans/rebuild-curation.md at commit 434bf4cb).

- [ ] **CTX-361** A `command.run` clear hook that reads `$.session.messages()` instead of forking gets `n=2` rows `{role,text,toolUses}` with origin `{kind:"sdk"}`; 2 requests are made and request 2 carries the extract.
  Basis: measured.
  Source: handover probe B, claude 2.1.325, 2026-11-16, cc-inspect cli on a fake API, stream-json prompts `first one`, `/clear`, `after clear`, plugin under --plugin-dir (recorded in plans/rebuild-curation.md at commit 434bf4cb).

- [ ] **CTX-362** `$.settings.read()` returns custom keys (`autoHandoverEnabled`, `idleHandover`); `$.env.get` reads `CLAUDETTO_*` from the process env and from settings `env`.
  Basis: measured.
  Source: handover probe C, claude 2.1.325, 2026-11-16, cc-inspect cli on a fake API, stream-json prompts `first one`, `/clear`, `after clear`, plugin under --plugin-dir (recorded in plans/rebuild-curation.md at commit 434bf4cb).

- [ ] **CTX-363** A `session.compact` answer `{messages}` on trigger `auto` is not reachable on the fake API: the stub always reports 10 input tokens, `replies` does not override `POST /v1/messages`, and `CLAUDE_CODE_AUTO_COMPACT_WINDOW` below 100k reads as the 100k minimum (`G0=1e5` on 2.1.325; `SD=1e5` in 2.1.326, `hL=1e5` in 2.1.327 at chunk-29d2mwq6.js@950). Read at `chunk-5121ahsh.js:950` on 2.1.325 as `G0=1e5`.
  Acceptance: the code at the line matches. Verification: inspection.
  Basis: measured.
  Source: handover probe D, claude 2.1.325, 2026-11-16, cc-inspect cli on a fake API, stream-json prompts `first one`, `/clear`, `after clear`, plugin under --plugin-dir (recorded in plans/rebuild-curation.md at commit 434bf4cb); chunk-29d2mwq6.js:950 (2.1.327) (claude 2.1.326 binary; was chunk-5121ahsh.js:950 in 2.1.325); `chunk-5121ahsh.js:950` (claude 2.1.325 binary) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:7297).

- [ ] **CTX-364** With a 60000-word `prompt.context` filler, then `/clear`, then a prompt, on Haiku 5.5, the `clear` hook's fork took 2401 ms and returned 365 characters; fork usage was 67542 cache-read, 5248 cache-write, 120 output tokens, $0.0018, against $0.0135 for the first turn; the next turn quoted `HANDOVER-CLEAR forkMs=2401`, so the `$.store` handover survived the clear and `prompt.context` injected it.
  Basis: measured.
  Source: handover probe E, claude 2.1.325, 2026-11-16, live paid run, `claude -p` stream-json (recorded in plans/rebuild-curation.md at commit 0e987414).

- [ ] **CTX-365** With a 110000-word filler and `CLAUDE_CODE_AUTO_COMPACT_WINDOW=100k`, two prompts produced `compact_boundary` `{trigger:"auto", pre_tokens:122980, post_tokens:275, duration_ms:4793}`; the installed `claudetto@claudetto-dev` compaction hook answered first with its fork handoff, so the probe's own `session.compact` hook never ran. `prompt.context` fires again after a compaction, so each block is paid again after it: the filler was re-sent at $0.24 for the second turn. A fork before `/clear` on Haiku 5.5 took 2401 ms over a 67k-token cached prefix: 67542 cache-read, 5248 cache-write and 120 output tokens, $0.0018 (live probe E).
  Acceptance: the probe logs match. Verification: probe.
  Basis: measured.
  Source: handover probe F, claude 2.1.325, 2026-11-16, live paid run, `claude -p` stream-json (recorded in plans/rebuild-curation.md at commit 0e987414); live probes E and F, Haiku 5.5, `claude -p` stream-json, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:7297).

- [ ] **CTX-366** `$.session.usage()` at `turn.complete` returns `{startedAt, context:{tokens, window, percent}, rateLimits, cost:{usd}}`; a `session.measure` hook fires after each main turn with the same fields plus `changed:["context","cost"]`; `$.clock.after(150)` fired at 254 ms, `every(100)` reached 3 ticks at 433 ms and `cancel()` stopped it, `sleep(300)` resolved at 416 ms. With one `-p` prompt a pending timer never fires, because the process exits after the last turn.
  Acceptance: probe G reproduces. Verification: probe.
  Basis: measured.
  Source: handover probe G, claude 2.1.325, 2026-11-16, cc-inspect cli on a fake API, stream-json prompts `first one`, `/clear`, `after clear`, plugin under --plugin-dir (recorded in plans/rebuild-curation.md at commit 434bf4cb) (hooks writing an array to a file with `$.fs.write`); probe G, `claude` 2.1.325, fake API, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:8057).

- [ ] **CTX-367** `$.env.get` returns a promise: an unawaited read gave `NaN` and an empty filler. Every `$.env.get` must be awaited.
  Basis: measured.
  Source: handover probe E, claude 2.1.325, 2026-11-16, live paid run, `claude -p` stream-json (recorded in plans/rebuild-curation.md at commit 0e987414), first runs.

- [ ] **CTX-368** Only one plugin's `session.compact` answer wins: the first hook that answers without `next(e)` ends the chain. `claudetto@claudetto-dev` must be uninstalled before dogfooding the rebuild, and handover must live in one module. `SessionCompactTrigger` is `manual | auto | plugin | precompute`; `auto` covers the threshold, a prompt that is too long, and idle compaction; a `session.compact` hook may answer `{skip}` or `{messages}` (clawdipedia types page).
  Acceptance: the type page matches. Verification: inspection.
  Basis: measured.
  Source: handover probe F, claude 2.1.325, 2026-11-16, live paid run, `claude -p` stream-json (recorded in plans/rebuild-curation.md at commit 0e987414); clawdipedia `extend/mod-api/types/session/compact-measure-messages` (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6738); (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:7297).

## Probes and Experiments

- [ ] **CTX-369** Probe 2.8b ran 35 fixtures: 18 were judged by the built-in classifier (16 blocked; `git checkout -- .` and `export -p` were allowed) and 17 were never judged because the claudetto gate's `tool.check` denied them first. The run used 1,657,843 tokens and $0.3882 (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:35.

## Probes and Experiments

- [ ] **CTX-370** Probe 2.8 found the `ceiling` field of a `tool.check` event absent on every case run (`research/probes.md` section 13); `engines` is in sections 3 and 14 and `AbovePrompt` in section 15 (probe record). `tool.check` input keys: tool, input, tool_use_id, agentId, isReadOnly. No ceiling appeared in any run. A deny rule (WebFetch) yields no `tool.check` event. `ui.render` hooks did not fire under `-p`.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-16-2-1-323/tasks.md:18; openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:147.

## Probes and Experiments

- [ ] **CTX-371** Claude Code caches an experiment assignment in ~/.claude.json (.clientDataCacheSlots[].data.experimentKey and .atis) and sends it with every request; r/ClaudeCode posts found that assignments change behaviour (more tool calls per reply, much longer shell commands, less narration) and one added system-prompt text; transcripts carry an atis-latch record per session, with history kept about 30 days; opt-out removes the assignment keys after a backup, plus an env var that people report blocks re-enrollment. Reported, one commenter each: experiment flags named turnstone_plinth (Opus 5.5) or dotterel_architrave (Fable 5.1) in the user's .claude.json mark a test group; attached prompts steer reasoning toward a "seen not done" effect (context held but not acted on); one poster confirms an experiment named claude_code_turnstone_plinth_experiment; check by searching .claude.json for "experiment.".
  Basis: reported (behaviour change not proven quality loss), unverified.
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xrpkdt-what-even-is-the-point-of-workin-20261110T094812Z.md:116; external/2026-11-10/reddit.com-r-claudeai-comments-1xrpkdt-what-even-is-the-point-of-workin-20261110T094812Z.md:117 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xrpkdt/what_even_is_the_point_of_working_rules_lol/>); external/2026-11-10/reddit.com-r-claudecode-comments-1xrw5rg-are-you-serious-20261110T095552Z.md:263 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xrw5rg/are_you_serious/>); external/2026-11-10/reddit.com-r-claudeai-comments-1xrxiru-i-made-a-free-tool-to-check-whet-20261110T094555Z.md:33; external/2026-11-10/reddit.com-r-claudeai-comments-1xrxiru-i-made-a-free-tool-to-check-whet-20261110T094555Z.md:41; external/2026-11-10/reddit.com-r-claudeai-comments-1xrxiru-i-made-a-free-tool-to-check-whet-20261110T094555Z.md:48; external/2026-11-10/reddit.com-r-claudeai-comments-1xrxiru-i-made-a-free-tool-to-check-whet-20261110T094555Z.md:49; external/2026-11-10/reddit.com-r-claudeai-comments-1xrxiru-i-made-a-free-tool-to-check-whet-20261110T094555Z.md:58 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xrxiru/i_made_a_free_tool_to_check_whether_your_claude/>).

## Probes and Experiments

- [ ] **CTX-372** Reported long autonomous task (Opus 5.5, Claude Code in VS Code, about 1 week, about 548M tokens of which 546.2M were cache reads and writes, about $200 at API list prices, run on a Pro plan): the model first said the task was impossible, then compared encrypted files against a few intact copies, found only the first 16 KB encrypted, built a per-format module tool re-run after each improvement (the last round brought back about 100 files), trained a U-Net, and recovered 26% fully, 27% damaged, 12% content-only, 35% lost.
  Basis: reported, one author, write-up not verified. Status: not applicable (outside fact).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xn6tu3-i-gave-claude-700-ransomware-enc-20261109T152841Z.md:36-45,49,67,198 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xn6tu3/i_gave_claude_700_ransomware_encrypted_files_it/>).

## Probes and Experiments

- [ ] **CTX-373** claudetto shall record these measured paid eval results (11 cases x 3 runs): Haiku 0.965 (+0.098, $0.22); Sonnet 0.948 (+0.052, $3.10); Opus 0.956 (+0.071, $6.38, stopped at $6 ceiling); `no-unasked-revert` lower with the plugin and did not reproduce; no case spawns a subagent, so no result covers agents and none is claimed for them.
  Acceptance: A paid run waits for the user's approval and budget report (task 10.3; reported). Verification: inspection.
  Basis: measured. Status: unchecked: a measured result, not code at 088a227c.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:255; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:262.
