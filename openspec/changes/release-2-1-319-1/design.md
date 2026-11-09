# Design

## Context

`release-2-1-319` (`openspec/changes/archive/2026-11-09-release-2-1-319/`) rebuilt claudetto on the Claude Code v2.1.319 engine. `ISSUES-2026-11-09-1422.md` records what held the agent back since. This change keeps the engine and the version string.

## Goals

- Fix or record each open item of `ISSUES-2026-11-09-1422.md`.
- Re-audit every rule, gate, and hook (issue item 16).

## Non-Goals

- A new Claude Code engine version.
- A new version string. `package.json` stays at `2.1.319`.

## Decisions

- Branch `feat/2.1.319+1`, change `release-2-1-319-1`. The person chose the SemVer build-metadata form, because build metadata marks a build without a new version.
- The first delta is `constraint-ledger`, because issue items 3 and 13 recur on every prompt: the ledger showed "Do not delete branch 2-1-319" and "Leave alone ... package.json" again on 2026-11-09 while this change was set up. The other deltas follow from tasks 1.1 and 1.2.

## Issue Map

| Item (2026-11-09) | Delta | Code |
| --- | --- | --- |
| 1 | permission-policy: protected-path check | `hooks/gate/processes.ts` |
| 2 | permission-policy: branch gate | `hooks/gate/processes.ts:286-293` |
| 3, 13 | constraint-ledger | `hooks/pin.ts`, `texts.ts:442-445` |
| 4 | permission-policy: Read redirect | `hooks/gate/rules.ts:120-121` |
| 5 | out of reach: core classifier | none |
| 6 | out of reach: MCP environment | none |
| 7, 8 | run-limits | `hooks/slices.ts:128-139`, `texts.ts:61-69` |
| 9 | claim-check | `texts.ts:473-475` |
| 10 | lean-openspec | `plugins/claudetto-openspec/openspec.ts:97-104`, `justfile:46` |
| 11 | session-handoff | `hooks/handoff/` |
| 12 | permission-policy: standing instruction | work gate |
| 14 | agent-conduct | `Concise.md:23`, `limits/open-items.ts:12` |
| 15 | later: probe whether Mods and the TUI allow a reply to one part | none yet |
| 16 | task 1.2 | all |

The 2026-11-02 items 1 and 5 (classifier) and 6 (prompt wording review) stay out of reach; item 11 (message 0 rewrite) joins the probe in task 3.

Items the person raised in the session on 2026-11-09, after the issues file:

| Item | Delta | Code |
| --- | --- | --- |
| A: each start logs "claudetto walls off `~/.claudetto-holdout`, but your settings hold no `Read(~/.claudetto-holdout/**)`" | permission-policy: walls; setup writes the deny | `plugin.json:107-113` default wall, `gate.ts:221-229` notice, `setup/settings.ts:76` writes only `DENIED_TOOLS` |
| B: setup asks a write-or-skip question per step; a cheap model should talk and decide | setup | `hooks/setup.ts`, `hooks/setup/steps.ts` |
| C: on task 2.8 the agent wrote a test that the removed faults stay gone; the person: "adding tests for removed features should be forbidden. it is not a 'compatibility' phase", "claudetto should actually endorse this", "treating every pre-release project as 'legacy compatibility' and 'v1' is grounds for troubles like this" | agent-conduct | `texts.ts:32` `<defects>` asks for a failing test first and says nothing on removals or pre-release status |

## Audit (Task 1.2)

Three read-only agents read each hook, gate, rule, and prose file against `openspec/specs/` on 2026-11-09. Every row is from reading, not a probe, except the rows marked "grep-checked". Rows that the Issue Map already holds are left out.

### Contradictions

- permission-policy:36-39 passes an engine `deny` reason unchanged; `gate.ts:250-253` appends "The rule `X` denies it."
- permission-policy:24,31-34 wants a stop-and-report text with no resend; `gate.ts:288-291` sets `retry: true` on a reasoned denial under the bound.
- low-hitl:155 says no `tool.check` hook judges a permission; `gate.ts:234` registers one.
- low-hitl:188,203 registers `decide` on option `decide` = `jev` plus a key; `register.ts:35` checks only `typesafeApiKey`. low-hitl:188-193 says "confidence"; `texts.ts:325-326` prints "probability".
- dangerous-commands:57 lists what `rules.ts` holds; `rules.ts:110-123` also holds kill, release-run, ref-move, owned-removal, and marker verdicts.
- status-line:10,15 "Stdin Only"; `hooks-off.ts:65-68` reads the transcript tail and the heartbeat, `local.ts:141-158` reads the window file.
- status-line:123 shows `hit_ratio` only while warm; `segments.ts:237,243` adds it to the cold text.
- run-limits:69,91-94,98-99,106-109 verify a denial in the turn, detect an offer in prose, and pass a `! <command>` item; `open-items.ts:18-38` reads only an open AskUserQuestion, has no offer detection, and `stop.ts:93` blocks a `! <command>` item outside the heading.
- run-limits:86-89 lists the items; `stop.ts:100-102` (`ASK_FORM`) tells the model to ask each through the tool and delete it.
- run-limits:37 reports each running task; `stop.ts:73-84` reports only when the set changes.
- constraint-ledger:75 denies a question's first tool batch; `pin.ts:183-189,249-253` lets Read, Grep, Glob, ListAgents, and a dispute's Bash pass.
- window-budget:10 states the 7-day share at 90% or more; `stop.ts:288-304`, `budget.ts:15-36` add a `Budget:` line on any 10% band change of context, 5h, or 7d.
- prompt-footprint:37,64 forbid a tool that duplicates an existing one; `register.ts:33-34` adds `ask-user-question` and `monitor`, which wrap AskUserQuestion and Monitor.
- surface-trim:99 keeps the shorter text; `delegation.ts:96-99` sets `AGENT_TEXT` with no length check.
- claim-check:10 lists credited, fallback, unchecked, rules, unfiled; `texts.ts:468-509` offers asks, jargon, confesses, narrates, unfixed, unseen and no unfiled (grep-checked: no `unfiled` in `plugins/`).
- session-handoff:181 gives the tool fields ruled-out, check command, files touched, and the person's prompts verbatim; `handoff/tool.ts:5-14,53-66` has none of them.
- session-handoff:53,63,80,153 want a fixed "code could not read" line; `transcript.ts:104-109`, `tool.ts:61-65` write "None found/given".
- session-handoff:162 writes a code-built file on an unreadable misnamed file; `handoff.ts:59-63,94-97` only logs.
- session-handoff:84-89 shows the file name pattern; `texts.ts:418` does not.
- mod-architecture:17-20 wants one writer under `handoffs/`; `handoff.ts:80-107`, `handoff/call.ts:96`, `handoff/handover.ts:92` are three. mod-architecture:10 wants one writer per settings key; `setup.ts:238-253,408-433` both write `statusLine`.
- version-floor:10 keeps a higher `minimumVersion`; `settings.ts:121,301-317` overwrites it on "Replace mine too". version-floor:19 adds a context line; `setup.ts:461-465` uses `$.ui.log`. version-floor:4 says 2.1.316, its requirements say 2.1.318.
- subagent-prompts:10-37 want tagged sections, a tagged report block, FAFO, `<blocks>`, `effort`, `omitClaudeMd`; `agents/*.md` are two plain paragraphs and Heracles says "ask nothing back".
- agent-conduct:273 bans negation words in the output style; `Concise.md:11,15` use "not" and "no". agent-conduct:144,264 name one rules file; `rules/` ships five.
- lean-openspec:92 lists archive's processes; `archive.ts:239-241` also runs `mkdir -p`. lean-openspec:101 stops apply on an error; `apply/SKILL.md:9` also stops on a warning.

### Dead Spec

- permission-policy:66-73 "A Secret Stays off the Command Line": no rule; `GATE_ENV_VALUES`, `GATE_ENV_DUMP` (`texts.ts:335-342`) are unused (grep-checked).
- permission-policy:75-81 "A Search Pattern Is Not a Path": no secrets gate reads patterns; `walled.ts:39` treats each word as a path.
- permission-policy:107-114 `git push origin :main` asks: not found outside the vendored rules (unread).
- low-hitl:168-175, 205-212, 216-221: fail closed when the classifier is down, the dialog reaches the user, ask once late.
- run-limits:44-56 "End Stuck Agents" (the spec says unbuilt).
- constraint-ledger:64-71 "An Ask Waits for the Newest Issues File", claim-check:35-38,47 `unfiled`.
- session-hygiene:8-14,27-39 "Stale Generated Files Go" under `~/.claude/`.
- compaction-path:24-27 "The Code Path Is Offered Again".
- building-blocks:8-24, the whole spec (grep-checked: no `attachBlocks` in `plugins/`).
- session-handoff:134 size-0 check, :195 composer-origin `/clear`.
- Process-only rows that need no code: dangerous-commands:48-53, prompt-cache:8-96,107-114, prompt-footprint:10-24, agent-conduct:165-172, builtin-rebuild:8-20, lean-openspec:117-124, compaction-path:29-33, repo-gate:8-24.

### Uncovered

Gate: endless-wait deny (`gate.ts:142-152`); the `/tmp` marker scheme (`processes.ts:238-277`); owned worktree and branch removal (`processes.ts:279-294,321-337`); kill of an unowned pid (`processes.ts:80-98`); running a released `claude/versions/<v>` (`processes.ts:100-104`); ref moves (`refs.ts:14-35`); recreate of a vanished file (`recreate.ts:231-261`); unreadable command asks (`rules.ts:137-139`); read-only `ask` becomes `allow` (`gate.ts:253-261`); the ask log (`gate.ts:176-213`); the wall notice (`gate.ts:221-231`); `Monitor` judged as shell (`gate.ts:153`); a throw becomes `ask` (`gate.ts:269-270`); the explained repeat-denial (`denials.ts:26-37`).
Decide: fallthrough on a malformed call (`decide.ts:17-19`); `approval_<i>` and `JEV_GIVE_BACK` (`judge.ts:72-92,166-168`).
Limits: concurrent subagent cap (`hold.ts:14-17,39-42`); interrupts not failures (`hold.ts:49-58`); test-output cut (`bound-output.ts:128-163`); heartbeat and window files (`heartbeat.ts`, `line-file.ts`); `COMMAND_FORM` block, headless pass (`stop.ts:93-97`); cleanup on stop (`stop.ts:268-273`, `cleanup.ts:73-108`); headless commit skip (`slices.ts:151-155`).
Ledger: the `dispute` class (`pin.ts:73-79`); resumed-session wait (`pin.ts:212-223`).
Surface: agent type shown as "Explore" (`delegation.ts:121-123`); listing trim (`delegation.ts:127-141`); the ask and monitor wrappers (`delegation.ts:143-208`); `DEFERRED_TOOLS` (`surface.ts:14-25`); `OFF_SKILLS` (`surface.ts:106-180`); plan-mode text, `/init` interview (`surface.ts:201-219`); `CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT` (`settings.ts:162`).
Hygiene: build-folder sweep and `trash.toml` (`sweep.ts:229-255`), marked temp folders (`sweep.ts:198-226`), one-day output and heartbeat sweep (`sweep.ts:258-261`).
Status line: every segment, the row flow, colour, and subagent rows (`segments.ts`, `rows.ts`, `color.ts`, `subagents.ts`); the 4.4-4.6 deltas cover window, flow, and colour.
Handoff: register retry, resume age skip, in-progress and missing-field refusals, turn abort, redaction, caps, the `/handoff` command (`handoff.ts`, `handoff/*.ts`, `commands/handoff.md`).
Setup: starter files, ignore blocks, ast-grep and Mole installs, Mole `purge_paths`, the Context7 key, the per-rule copy offer, missing-tool and disk notices, the turned-off plugins, the git allow rules, the Auto-mode rule texts, the Haiku window override, five unlisted settings, the `/statusline` description (`setup.ts`, `setup/*.ts`).
Prose: five `Concise.md` sentences (7, 11, 15, 19); `noUnrequestedEdits.md:6` doc update; rule frontmatter; agent bodies and models; the four OpenSpec skills explore, propose, update, verify; the OpenSpec `status` action and refusals (`openspec.ts`, `archive.ts:213-219`, `validate.ts`); the you-should-know parse, caps, buttons, and model default.

### Reading

Each uncovered behavior is kept and gets a requirement in task 1.3, unless the person removes it below. Each contradiction is settled in 1.3 toward the code, unless the code is the defect named in the Issue Map. Each dead requirement is removed in 1.3, unless the person keeps it as work to build.

### Removals the Person Chose (2026-11-09, Popup)

- Removed: permission-policy "A Secret Stays off the Command Line" with `GATE_ENV_VALUES` and `GATE_ENV_DUMP`; the building-blocks spec; constraint-ledger "An Ask Waits for the Newest Issues File" with the claim-check `unfiled` fault.
- Removed: the grader faults `asks`, `jargon`, `confesses`, `narrates` (`texts.ts:485-504`). `unfixed` and `unseen` stay and get requirements.
- Kept as work to build ("unbuilt extras may need to be built"): run-limits "End Stuck Agents", compaction-path "The Code Path Is Offered Again", session-hygiene "Stale Generated Files Go", low-hitl fail closed when the classifier is down.
- Kept, with the spec moved to the code, on the person's word that claudetto replaces a built-in that costs too many tokens on purpose: the `ask-user-question` and `monitor` tools replace AskUserQuestion and Monitor (prompt-footprint:64 names them as replacements, not duplicates); the `Budget:` line on a 10% band change (window-budget:10); the `Explore` result type, which the engine sends with no `agentId`/SendMessage/`<usage>` trailer (`Ann = new Set(["Explore","Plan"])`, `chunk-w4eat4qp.js:639`; trailer skip `chunk-158pvgb9.js:62825`; observed with cc-inspect search).

### Probes of the Three Kept Items (2026-11-09, Fake API, cc-inspect `cli`)

The person asked for these to be probed before their specs move.

| Item | Hypothesis | Result |
| --- | --- | --- |
| Explore type | With the rename the result has no `agentId:` trailer; without it, it does | Confirmed: with `delegation.ts:122` removed from a copy, `agentId:` appears in the next request; with the plugin as is, it does not. Size about 194 B per result, computed from the engine template, not measured. |
| Wrapper tools | The wrapper costs fewer bytes than the stock tool | First request: neither the stock tools nor the wrappers are in `tools`, with or without the plugin, so the wrapper adds 0 B up front (observed by tool names). Loaded size: wrapper 398 B and 845 B (computed from `texts.ts:164-202`); stock size unmeasured, because `cli` returns no request bodies. Open. |
| `Budget:` line | The line enters a prompt after the first turn and sits after the cache breakpoint | Unmeasured: `-p` submits one prompt, so the `prompt.submit` line never fires, and `cli` returns no bodies. Open. |

The two open rows need request bodies and a multi-prompt run; filed as `www.clawdipedia.cc/ISSUES-2026-11-09-1343.md` items 1 and 4.

## Handover Instead of Compaction

Read on 2026-11-09 in the 2.1.319 engine and the Mods types; no runtime probe ran, because the classifier denied the cc-inspect run.

- A `session.compact` hook that answers with its own `messages` makes no summarizer request and keeps the cached prefix (`index.d.ts:11734-11754`). Claudetto's forked handover (`hooks/handoff/handover.ts:45-69, 125-160`) already does this.
- `$.command.run({command:"clear"})` then `$.prompt.submit(text)` clears and seeds, but the seed is a user prompt, not a compact summary; the Mods API has no way to clear and install a compaction boundary at once. The two routes are kept for two jobs: the handover inside a task, the clear at a task boundary.
- Observed in this project's transcripts: the first request after the built-in compaction read 5,819 and wrote 19,448 tokens at 1h; the first after a typed `/clear` read 5,819 and wrote 7,101. ISSUES 2026-11-02 item 12 measured a handover at $0.043 against $0.094 for the built-in compaction at 166k tokens, one run per arm.
- Reported by other users, pasted by the person on 2026-11-09: compaction costs more tokens than it saves, and a handoff file kept current in real time plus `/clear` at a milestone, while the cache is warm, works better; splitting a task into small subagent tasks on a lesser model, with only the context each needs, saves tokens; a tool that keeps command output in a local searchable store beats `cmd | tail -40 | grep foo`, which can miss what was needed. One user's complaint: the agent redid a finished UI design in place of using it. These are reports, not measurements, and feed tasks 3 and 4.2.
- Reported by other users on the Claude Discord, pasted by the person on 2026-11-09: deeper in a long context the model drops earlier instructions and skills and falls back to old habits; it greps and assumes from names and imports in place of reading the implementation; users set auto-compaction at 350,000 to 500,000 tokens, or keep the context under 500,000, to hold adherence; hooks that inject a skill at session start and after compaction work "reasonably" on Opus 5.5. These are reports, not measurements. The recall questions of the four-arm probe (task 3.3) test the first claim; a fake API cannot, because it does not model adherence.
- A screenshot from the same thread, pasted by the person on 2026-11-09, shows a second model's review of an Opus session: Opus quoted numbers from a simulation it knew was broken as the reason for a decision, put a question to the person built on those numbers, invented a problem, and stated its own defaults (sample count, match threshold, a 60-minute cache lifetime) without marking them as its own. This is the failure the claim-check grade (`unchecked`, `unseen`) and the rule to source each number or mark it unmeasured target; it is a report, not a measurement.
- A community tip, pasted by the person on 2026-11-09: a model asked "which is better, A or B" gives a generic answer, and one given the person's own context and asked what matters for them, what is marketing, and to say when it is not sure gives a useful one. Task 2.10 applies it to the setup advice prompt (`hooks/setup/text.ts` `SETUP_ADVICE`): Haiku judges from the person's own settings that the question shows, weighs keeping a value they set, and gives no recommendation when the question does not show enough. Untested against a live Haiku; the lab stubs the reply.
- A Reddit thread on r/ClaudeAI, pasted by the person on 2026-11-09 (<https://www.reddit.com/r/ClaudeAI/comments/1xrtmvs/>): ending a rough task with "Before you start, ask me any questions you need answered to do this well" gives a closer first draft than a long prompt, at the cost of one round of questions. Replies point to Matt Pocock's `grill-me` skill (<https://github.com/mattpocock/skills>, `skills/productivity/grill-me/SKILL.md`) and to <https://re-cinq.com/blog/grill-me-skill>. Per that post (fetched 2026-11-09; it does not quote the skill text), `grill-me` asks one question at a time, gives each a recommended answer the person can accept or change, looks up what the environment can answer itself, and stops when the person confirms a shared understanding. Task 2.10 takes the same shape for setup: one popup per step, each with a recommended option. claudetto's request rule already asks only for what the person alone holds and settles the rest from the repository; it does not add an up-front round of questions, and this change adds none. The thread holds reports, not measurements.
- Decision, the person's choice on 2026-11-09: setup keeps `/loop` off (`CLAUDE_CODE_DISABLE_CRON=1` makes its gate `c0` false, `chunk-j95krm32.js`; cc-inspect `cli` sent the `/loop` text with the variable empty and not with `"1"`), keeps `/goal` on, and leaves polling to the `monitor` tool, because each `/loop` fire sends the whole context again and `/goal` only judges at Stop. `/restart` is not claudetto's: its gate `qgn` (`chunk-24jdhyyr.js:2182550`) needs the GrowthBook flag `tengu_fancy_wand` (default off), an interactive terminal, and macOS or Linux.
- Decision: keep the forked handover as the path inside a task and the handoff tool plus clear at task boundaries; change the threshold only from the four-arm probe in `specs/compaction-path/spec.md`, because the existing data has one run per arm.

## Free Fake-API Probes (2026-11-09, Claude Code 2.1.319, cc-inspect `code` `cli`)

Each run is `-p probe-parent-prompt-7731` with one scripted `Agent` call whose prompt is `probe-child-prompt-4419`, and cc-inspect's `query` names each request whose body holds a text. The child is the request whose tool list lacks `Agent`.

| Task | Hypothesis | Prediction | Run | Result |
| --- | --- | --- | --- | --- |
| 4.2.1 TTL | `subagentPromptCacheTtl` sets the `ttl` of the subagent's requests and not of the main loop's | Under `1h`, `"ttl":"1h"` only in the child; under `5m`, no `ttl` field | settings `{"subagentPromptCacheTtl":"1h"}`, then `"5m"`; queries `"ttl":"1h"`, `"ttl":"5m"`, `"cache_control":{"type":"ephemeral"}` | Confirmed. `1h`: found in request 4 (the general-purpose child) and the side requests 2, 3, 6, 7; not in main requests 1, 5, 8. `5m`: `"ttl":"1h"` and `"ttl":"5m"` in no request; bare `{"type":"ephemeral"}` in all 8. |
| 4.2.1 fork | With `CLAUDE_CODE_FORK_SUBAGENT=1`, a fork child resends the parent's prefix; a fresh child does not | Parent prompt in the fork child's request, not in the fresh child's | env `CLAUDE_CODE_FORK_SUBAGENT=1`, `subagent_type` `fork`, then `general-purpose`; query each prompt | Confirmed with `subagent_type: "fork"`: 4 requests, all with the parent's tool list; parent prompt in all 4; child prompt in 2, 3, 4. Fresh child (request 4 of 8): own tool list, no parent prompt. Without `subagent_type`, the env alone gave a fresh general-purpose child: the engine picks a fork only by `subagent_type: "fork"`, "never the default" (`chunk-24jdhyyr.js:2400027`). |
| 4.2.1 fork TTL | The fork child takes `subagentPromptCacheTtl` | `"ttl":"1h"` in the fork child only | as above, with `{"subagentPromptCacheTtl":"1h"}` | Confirmed: only request 2 (the fork child) holds `"ttl":"1h"`; the parent stays at 5m. Whether a 1h child marker after the parent's 5m prefix still reads that prefix from cache needs a paid run; unmeasured. |
| 3.1 | The summarizer request keeps `cache_control` on the parent's prefix, because `skipCacheWrite` moves the marker back one message (`chunk-24jdhyyr.js:2589218`, `:2695646`) | `cache_control` present, before the summarize prompt | `sh .claudetto/cc-inspect-handover/fake-api-bodies/compact-probe.sh $TMPDIR/probe-compact`, then `bun .claudetto/cc-inspect-handover/fake-api-bodies/marks.ts $TMPDIR/probe-compact/req.jsonl`, with `sandbox.network.allowLocalBinding` on (2026-11-09) | Confirmed. Request 2 is the summarizer: same model (`claude-opus-5-5`) and 12 tools, last message "CRITICAL: Respond with TEXT ONLY…". Its markers are `system[1]`, `system[2]`, and `messages[2].content[0]`, the parent's last message, not the summarize prompt at `messages[3]`; request 1 marks `system[1]`, `system[2]`, `messages[1].content[0]`. No `ttl` in either, so the 5-minute default. A compaction reads the parent's cached prefix. |
| 3.2 | — | — | — | Not built yet; 3.1's server and `marks.ts` are its base. |
| 4.1.2 (2026-11-09, macOS 27.2, session sandbox on) | `osascript -e 'return 1'` passes because it sends no Apple Event; a `tell application` call is blocked | `return 1` prints `1`; `tell application "Finder" to get version` fails with -600 or -1743 | In this session's Bash, sandboxed (an append to `~/.claude/loop.md` and `ps` both fail "operation not permitted"): `osascript -e 'return 1'`, `osascript -e 'tell application "Finder" to get version'`, `open -a NoSuchAppProbe7731` | Refuted. All three reached their target: `1`, `27.2`, and "Unable to find application", not -10822. No settings source sets `allowAppleEvents` or `allowMachLookup` (`~/.claude/settings.json`, `.claude/settings.local.json`; no managed settings). The engine adds `(allow appleevent-send)`, the appleeventsd lookup, and `lsopen` only under `allowAppleEvents` (`chunk-fcp0yk24.js:769604`), yet shows the "blocked" text whenever that is not `true` (`chunk-24jdhyyr.js:3442135`). An `allowMachLookup` entry `*` becomes `(global-name-prefix "")`, every Mach service (`chunk-fcp0yk24.js:769888`), but it is not set here. Open: whether macOS 27 enforces `appleevent-send` under `(deny default)`. A nested `sandbox-exec` fails `sandbox_apply: Operation not permitted`, and `log show` fails "Cannot run while sandboxed", so the test needs a shell outside the sandbox. The same nesting limit means a cc-inspect `cli` probe run from a sandboxed shell cannot apply its own sandbox. |
| 4.1.2 retry (2026-11-09, 17:37) | `get version` and `return 1` send no Apple Event; an event Finder must answer is blocked | Outside the sandbox, `get version` passes under `(deny appleevent-send)`; inside, `get name of startup disk` and `count windows` fail | The person ran `sandbox-exec -f {allow,noae,nomach}.sb osascript -e 'tell application "Finder" to get version'` outside the sandbox; I ran the two events and `open -R /tmp/claude-501/probe-ae/allow.sb` in the session sandbox | Confirmed for `osascript`. All three profiles returned `27.2`: AppleScript answers `version` from the bundle, and `return 1` sends nothing. In the sandbox both real events failed "Finder got an error: Application isn't running. (-600)", so Apple Events are blocked as the session text says. `open -R` returned 0, but no Finder window appeared (the person, 17:38), so the sandbox blocked the reveal and `open` reported success anyway. Both passes of the first probe were false: `return 1` sends no event, and `open -R` exits 0 when blocked. The session text is right; a probe of `open` must check what it did, not its exit code. |
| 4.1.1 (2026-11-09, real install, macOS 27.2) | `gh` passes TLS under `allowMachLookup` `["*"]` with no `enableWeakerNetworkIsolation`, because the prefix rule covers `com.apple.trustd.agent` | With the entry `gh api user` prints the login; without it, it fails TLS | The person ran `claude -p 'Run gh api user --jq .login in Bash …' --settings '{"sandbox":{"network":{"allowMachLookup":["*"]}}}' --allowedTools Bash` twice; I ran `gh api user --jq .login` in this session's sandbox, which has no Mach entry | Confirmed. With the entry: `xsyetopz`, exit 0, both runs. Without it: `tls: failed to verify certificate: x509: OSStatus -26276`, exit 1. Setup writes no `enableWeakerNetworkIsolation` (`grep` over `plugins/`, this change, `CHANGELOG.md`, `docs/`: no hit), so nothing is dropped. |
| 4.1.3 (2026-11-09, 2.1.319 source, no Linux run) | Each rule of `specs/sandbox/spec.md` has a bubblewrap form, except the macOS-only keys | The Linux wrapper turns paths into bind mounts and ignores Mach keys | cc-inspect `code` `search` and `read` in `chunk-fcp0yk24.js` and `chunk-qmnffndf.js` | Read from source, not run on Linux. `allowWrite`: `--ro-bind / /`, then `--bind <p> <p>` for each path that exists; a missing one such as `/Volumes/` is skipped ("Skipping non-existent write path", `chunk-fcp0yk24.js:746233`). `denyWrite`: `--ro-bind <p> <p>` over each path inside an allowed write path; a missing path such as `~/Library/LaunchAgents` gets `/dev/null` or an empty folder mounted, to block its creation; a link that does not resolve fails closed with `/dev/null` (`:750116`). `denyRead`: a folder becomes `--tmpfs <dir>` with the allowed paths beneath it bound back (`:742696`); a file becomes `--ro-bind /dev/null <file>` (`:750900`). `allowMachLookup` and `allowLocalBinding` say "macOS only" in the settings schema (`chunk-qmnffndf.js:141928`), and the Linux call `l1` gets no `allowMachLookup` (`chunk-fcp0yk24.js:847700`), so Linux needs no form for them. `allowedDomains` goes through the proxy socket (`httpSocketPath`, `:847700`). `excludedCommands` is matched before the wrapper on both platforms (`chunk-qmnffndf.js:164363`); `launchctl list` does not exist on Linux, and whether `ps`, `top`, and `sysctl` fail under bubblewrap is unmeasured. The block setup writes needs no Linux variant: its macOS-only keys are ignored, and its macOS-only paths are skipped or blocked from creation. |

## Risks

- The re-audit can widen the change past the issues file. Task 1.2 lists each removal for review before any code moves.
