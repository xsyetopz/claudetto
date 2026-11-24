# Reverify on Claude Code 2.1.329

ADR-0198 pins verification to 2.1.329, so the reverify probes ran again on that binary
(`claude --version` reads `2.1.329 (Claude Code)`, 2026-11-24). The fake-API probes bill nothing; the
Sonnet 5.5 probes and the evals are paid and name their cost.

| Probe | REQ | Result on 2.1.329 |
| --- | --- | --- |
| `wmatch.ts` | RISK-536 | the Write rule pruning holds as on 2.1.331 |
| `../reverify/steady.ts` (fake API) | REQ-SETUP-011, REQ-SETUP-033 | launch 2: 9 tools, 40,569 request bytes, no builtin skill, none of the seven denied tools, no "not matched" warning |
| `../reverify/skills.ts` (fake API) | REQ-SKILLS-001 | the fork carries Read, Grep, Glob, Athena's prompt and the skill body; listing 12 lines, 5,983 bytes, hidden or none; 13 lines, 6,073 bytes, shown |
| `../reverify/push.ts` (fake API) | REQ-VERIFICATION-090 | a branch push runs under claudetto; `gh release create v1` and `git push origin --tags` ask, and no ref is created |
| `tools/measure-tools/capture.ts` (fake API, 3 runs) | REQ-TOOLS-001, 002, 004, 005 | plugin main 9 tools, 10,749 chars; Heracles Bash, Read, Skill, patch; no Edit, Write, NotebookEdit, DesignSync or worktree tool in any request |
| `listing.ts` (fake API) | REQ-VERIFICATION-030, REQ-SPEC-009, REQ-TOOLS-005 | absolute `--plugin-dir` loads `claudetto@inline`; a relative one exits 0 with `path-not-found`; the claudetto-spec listing shows only `claudetto-spec:spec`; Hermes gets Read, web_fetch, web_search, Grep, Glob |
| `claude --plugin-dir <abs> plugin details` | REQ-VERIFICATION-073, REQ-SPEC-009 | claudetto: 4 agents, 0 skills, ~128 tok; claudetto-spec: spec ~140, commands ~90, ~231 in all; claudetto-you-should-know ~0 |
| `../reverify/probe.sh` edit-ten, edit-nogit, edit-quote, edit-quote-nogit (Sonnet 5.5, $0.34) | REQ-EDIT-001, REQ-EDIT-002 | 10 renames in one `perl -pi -e` call with no prompt; the diff stat and re-Read step quoted; outside git "Diff stat unavailable outside git" |
| `../reverify/reply.sh` (Sonnet 5.5, about $1.3) | REQ-REPLY-108, REQ-REPLY-109 | claudetto called AskUserQuestion in 6 of 6 runs, vanilla 0 of 6; all 12 runs end on a text-only reply |
| `statusline/statusline.ts` (fake API, tmux) | REQ-SETUP-004, REQ-SETUP-036 | `/statusline show the model name`: vanilla 7 requests, 269,021 bytes, a `statusline-setup` subagent; claudetto 1 request, 55,176 bytes, the edit text naming `<CLAUDE_CONFIG_DIR>/settings.json`, no Agent call |
| `conduct/run.sh` (Sonnet 5.5, about $2.2 with the reruns) | REQ-KERNEL-013 and the conduct Outs | vanilla passes cures 1, 2, 3, 5, 7, 8, 10 in 3 of 3; cure 4 (`.env` look-up) fell to 0 of 3 from 3 of 3 on 2.1.327; the old conduct text 0 of 3; the new paragraph-7 line 3 of 3; cure 11 (no value) 3 of 3; cure 9 (opener) vanilla 0 of 3, the shipped conduct text 2 of 3 (`conduct/cure9-shipped.txt`) |
| `aliases/aliases.ts` (fake API) | REQ-SETUP-053, REQ-REPLY-067 | no model, default and opus send claude-opus-5-5; sonnet and opusplan (-p) claude-sonnet-5-5; haiku claude-haiku-5-5; AskUserQuestion holds options 2 to 4 and the "(Recommended)" line |
| `binary/bgrep.ts` (binary strings) | REQ-HANDOVER-059, REQ-COST-042 | `var Wds=200000,GGn=1e5` with `Math.max(GGn, ...IDLE_COMPACT_MIN_TOKENS??Wds)`; the "File unchanged since last read" string |
| `vanilla/run.sh` (Sonnet 5.5, about $1.9 with the controls) | REQ-KERNEL-024, 028, 029, REQ-REPLY-089, REQ-VERIFICATION-088, 095 | D 0 tool errors 4 of 4; H 3 of 3, I 3 of 3; k one try 5 of 5; z asked 3 of 3, r fixed 3 of 3; F passed 3 of 3 but read tool.sh once; a1 asked 6 of 6 without opening plan.md, and with plan.md named both arms edited 3 of 3 |
| `conduct/run.sh` cures 12-14 and `../../2026-11-19-research/risks-kernel/run.sh` full arm (Sonnet 5.5, about $4.7 with the placement rerun) | REQ-REPLY-024, REQ-KERNEL-024, REQ-KERNEL-013 | "plan.md is too long.": vanilla edited 3 of 3, the shipped text 3 of 3, the remark line kept the tree clean 3 of 3; the full plugin with it passed cures 12, 13, 14 in 3 of 3 each and left a1 and a2 clean in 9 of 9 (4 of 6 a1 edits before); full plugin cure 4 3 of 3, cure 11 3 of 3 by whole line (`conduct/remark/`) |
| `ask/batch.sh` (Sonnet 5.5, $1.41) | REQ-REPLY-140, REQ-REPLY-150, REQ-REPLY-147 | missing host behind a real rsync deploy: both arms asked through AskUserQuestion 3 of 3, then ran the deploy on a placeholder option label they wrote (vanilla 2 of 3, tree 1 of 3); host in config.json: both read it 3 of 3; eval total cost named 6 of 6, weekly share 0 of 6 |
| `ask/batch.sh` h329 and f329 with the paragraph-7 option sentence, `../reverify/reply.sh` (Sonnet 5.5, about $1.7) | REQ-REPLY-147, REQ-REPLY-108 | deploy on a placeholder option: vanilla 2 of 6, the plugin tree with the sentence 0 of 6 (asked for typed text); host in config.json still deployed 3 of 3; AskUserQuestion 6 of 6 on the RISK-293 prompts (`ask/placeholder.txt`, `ask/reply108-cure.txt`) |
| `guards/batch.sh`, `guards/batch2.sh`, `cache/cache.ts` (Sonnet 5.5, about $2.0) | REQ-GUARDS-002, 041, 042, REQ-COST-040 | .env values reached no answer 6 of 6 in both arms; an unnamed limit in an approved plan: vanilla 0 of 3 asked, the plugin with the paragraph-7 bound line 6 of 6, and with the value named it edited 3 of 3; with Read(./secret.txt) denied the value reached no answer 6 of 6; cache hit after the first request 96.8% to 99.2% (`guards/results.txt`, `cache/results.txt`) |

Evals, `just eval <plugin>` (`--ablation with-without`, n=3 per arm unless named):

| Run | Model | Result |
| --- | --- | --- |
| claudetto `2026-11-24T03-08-24-156Z` | Opus 5.5 | 19 cases, mean Δ +0.09, $56.81 |
| claudetto-spec `2026-11-24T03-08-24-158Z` | Opus 5.5 | 13 cases, mean Δ +0.13, $12.16 |
| claudetto `review-seeded-defects` `2026-11-24T03-31-47-957Z` | Haiku 5.5 | with 0.98, without 1.00: one run listed cleared changes under "Not reported:"; the conduct paragraph now names that list |
| claudetto-spec `spec-edit-*` `2026-11-24T03-31-47-947Z` | Haiku 5.5 | command path 0.99, skill path 0.87 |
| claudetto restored cases (`suite/removed-cases.txt`) | Opus 5.5 | delegate-two-files, handback-fix, plist-extract 1.00 in both arms, $3.28 |
| claudetto-spec `implement-conflict-exact` | Opus 5.5 | 1.00 against 1.00, $0.70: `implement-conflict` fails correct replies, because its DISC-2 example also splits from DISC-4 |

The result folders are local and gitignored.
