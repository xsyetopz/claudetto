# Session Audits

Sources: user transcripts under `~/.claude/projects/`, read by six audit agents on 2026-11-13. No model calls were made and no files in those projects were edited. Token totals were deduped by message id, so output tokens are lower bounds. Labels: counted means a script counted records, read means a person-style reading of the transcript, inferred means a reading not checked by a probe.

## Projects Covered

| Project | Sessions | Main finding |
|---|---|---|
| claudetto | 36 (10 days, this session skipped) | 191 "What I Need From You" sections; 185 plugin denials; 196 Stop injections; 120 compactions |
| OpenSAD | 18 main, 221 subagent transcripts | 663 plugin denials (569 in subagents); 46 repeats of one `! git config` bullet; 167 Stop injections |
| OpenJoystickDriver | 2 large | 418 denials or `HooksError`; 224 `HooksError` from `useSetup/rules.ts:93`; one "not committed" block looped 44 times |
| clawdipedia | several | 319 `HooksError` lines in 12 minutes (`6953aaa7`); 7 `! sudo` bullets; 61 compactions |
| JagFx, versionlens-redux, apple-docs-mcp-next | several | 22 of 40 "What I Need" sections held a command the agent could run; 29 compactions |

## 1. "What I Need From You" Sections

| Fault | Count | Project | Basis |
|---|---|---|---|
| Sections in total | 191 / 102 | claudetto / OpenSAD | counted |
| Same `- ! git config core.hooksPath .githooks` bullet repeated | 30 / 46 (27 in one session, `3308c572`) | claudetto / OpenSAD | counted |
| `git worktree remove` or `branch -D` handed to the user because the worktree gate refused it | 15 / about 20 | claudetto / OpenSAD | counted |
| `claude setup-token` or `CLAUDE_CODE_OAUTH_TOKEN` bullets | 12 + 11 | claudetto | counted |
| Slash or plugin command in a `! ` bullet (`/claudetto-openspec:update`, `claude plugin update`, `- ! /login`) | 3 + 1 | claudetto, OpenJoystickDriver | counted |
| `! sudo` bullets, which cannot run because the `!` shell has no TTY | 7 | clawdipedia `76585f31` | counted |
| `- ! open <url>`, a question dressed as a command | 1 | OpenSAD `d660bb03` | read |
| `- ! just render-check` repeated after a sandbox denial | 17 | OpenSAD `3308c572` | counted |
| Settings edit handed to the user (`jq '.sandbox.allowUnsandboxedCommands = true'`) | 4 | claudetto `aea6b517` | counted |
| Hook form mismatch: `Concise.md` writes `- [ ] !`, the Stop hook wants `- !` | n/a | all | read |

User reactions, verbatim:

- claudetto `aea6b517` 09:42: "you should be able to invoke these commands on your own. the fact that you keep requesting the user to do things you could be doing, is yet another issue"
- claudetto `d21b8a3c` 16:33: "You need to handle all the 'not done' parts yourself. Yet another clauetto violation"
- claudetto `cc4fc018` 21:35: "stop it. this was no need for user request. stuck? stop it yourself."
- claudetto `aea6b517` 09:01: "MAJOR INAPPROPRIATE RESPONSE DETECTED"
- OpenSAD `3308c572` 15:38: "this is yet another violation... absolute garbage"

Cause (inferred): the worktree gate (`hooks/texts-gate.ts:127`) refuses cleanup, the sandbox refuses `.git/config` writes, and `Concise.md` says to give "a command only the user can run". So the agent hands over anything a gate refuses. Each Stop block then forces the same section again.

## 2. Reply Sections That Made Things Worse

| Pattern | claudetto | OpenSAD | Basis |
|---|---|---|---|
| "Not checked" lists | 5 | 10 | counted |
| "Rule slips" or "Slips this round" | 0 in replies, about 22 in compaction or handoff text | 3 | counted |
| "Say X and I'll ..." or "Should I go ahead" offers | 2 | 2 | counted |
| Stop "credits the user with a label or choice" | 22 | n/a | counted |
| Stop "ends on a step you say you will take" | 10 | n/a | counted |

- `d8989f87` 17:22: "Not checked: the 20 held-out branch cases were not rerun". The user replied "this is disgustin[g]".
- `2af43de8` 21:18: "Rule slips: I used `printf >>` to append... I read three files with `cat` and `sed`".
- `1a6fd0d9` 11:04: "Should I go ahead with all three?" The Stop hook forced the question into a popup, and the agent then wrote "You chose all three". The grader then flagged that as crediting the user.
- The gate text "say which part you did not check" (shipped in 2.1.319) and the grader at `texts-grade.ts:30` pull in opposite directions (read).

## 3. Hook Denials

| Denial | claudetto | OpenSAD main | OpenSAD subagents | OpenJoystickDriver |
|---|---|---|---|---|
| Use Read, not the shell | 60 | 51 (Read and Write together) | 184 | 88 |
| Use Write, not the shell | 34 | (above) | (above) | 199 |
| Worktree not created by this session | 48 | 13 | n/c | n/c |
| "User remarked or asked; requested no work" | 28 | 21 | 64 | 12 |
| `/tmp` folder with no session marker | about 22 (clawdipedia) | 11 | n/c | about 15 |
| `pkill` or loop limit | n/c | n/c | n/c | 16 + 16 |
| 15-minute agent limit | n/c | 0 | 20 | n/c |
| Pipe without `pipefail` | n/c | 2 | 13 | n/c |

n/c: not counted.

- OpenSAD `1a6fd0d9` 11:04–11:15: the user asked "So, is the refactor done?". The no-work gate read that as a question and denied all 35 tool calls of 5 delegated agents. The agents committed nothing.
- OpenSAD `688088e0` 18:13: the user pasted a CSP error and the gate denied the next `grep` and `lsof`.
- Retries: about 207 turns lost in claudetto sessions (inferred, one per denial plus retries).
- Path spam: `HooksError ... was not resolved` from `$.fs.stat` on non-path Bash operands. Counts: 319 lines in 12 minutes in clawdipedia `6953aaa7`; 224 in OpenJoystickDriver from `useSetup/rules.ts:93`; 1,818 in this session (counted).

## 4. Token Use

| Session | Project | Turns | Cache read | Cache creation | Output |
|---|---|---|---|---|---|
| 5709ef73 | claudetto | 1,199 | 101.8M | 2.87M | 891k |
| cd2e74f0 | claudetto | 1,100 | 95.8M | 2.24M | 544k |
| 0afb43bf | claudetto | 1,040 | 91.9M | 3.72M | 1.12M |
| 76585f31 | clawdipedia | 1,508 | 133.6M | n/c | n/c |
| f4b7e436, c86d66a7 | OpenJoystickDriver | about 1,400 each | 114–124M | n/c | n/c |
| 005f897e | OpenSAD | 753 | 65.1M | 2.90M | 800k |
| 3308c572 | OpenSAD | 659 | 53.9M | 1.28M | 393k |
| 62fb35cb | JagFx | n/c | 61.7M | n/c | n/c |

- Cache read is about 95% of tokens. Each extra turn re-reads 84–145k of context.
- Drivers: long main threads and file re-reads. `design.md` was read 34 and 58 times in two claudetto sessions. Hook-driven turns add more: OpenSAD `3308c572` had 65 Stop blocks, about 5.5M tokens or 10% of the session (inferred).
- `persisted-output` is not a driver (0–3 hits per session).
- Subagent-heavy sessions: clawdipedia `d9e65e3e` 82.6M and `3be7b245` 78M subagent cache read.

## 5. Goal and Stop Failures

| Pattern | Count | Basis |
|---|---|---|
| "Files not committed" Stop blocks | 70 claudetto, 98 OpenSAD (53 in `3308c572`), 44 in a row in OpenJoystickDriver `c86d66a7` | counted |
| Those blocks list `.claude/worktrees/agent-*` files, sibling repos, or the status-line heartbeat file | most | read |
| "Running shell" Stop check fired for one shell | 12 times (clawdipedia `3be7b245`) | counted |
| Goal echoes from the Stop goal feature | 15 (OpenSAD) | counted |
| "No file changed" stop while a `/goal` was open | 2 (JagFx) | read |
| User re-sent a goal after compaction | OpenSAD `10e1c566` twice; claudetto `b8e1aaed` 3 times | read |

## 6. Compaction

| Project | Compactions | Each |
|---|---|---|
| claudetto | 120, all auto | 140–145k pre, 18–22k post |
| OpenSAD | 67 | 140–150k pre, 8–26k post, 15–44k re-cache |
| clawdipedia | 61 | n/c |
| JagFx and siblings | 29 | about 140k |

- OpenSAD `005f897e` compacted 15 times in 3 hours, about every 10 minutes.
- Setup sets `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=50.0000` with `autoCompactWindow: 300000` (`useSetup/settings.ts:104`). That puts compaction at about 150k, which matches the observed trigger (inferred).

## 7. Naming and Case

- One direct user complaint, JagFx `62fb35cb` 2026-11-12T19:03: "buttons that are not CAPS, could use Title Case, so "Live Preview" instead of "Live preview", amongst others like it." (as the auditor reported it; not re-read)
- Headlinese for identifiers appears only in coordinator briefs. OpenSAD `10e1c566` reads "New user rule: identifiers in source code use headlinese, with no articles … comments are exempt … `testDeadPlayerTakesNothing`". JagFx briefs at 17:46 and 18:05 ask for comments without articles, which conflicts with that brief.
- Neither the auditor nor the coordinator found the user's own wording of the headlinese rule. In session `17435f50` the user raised it as "agents not using headlinese in code items (e.g, function names) … or missing Title Case where conventions or systems encourage (e.g, markdown docs, Apple's HIG guidelines where fit)".
- claudetto ships no naming or case rule; `rules/useBlockLanguage.md` is the only wording rule.
