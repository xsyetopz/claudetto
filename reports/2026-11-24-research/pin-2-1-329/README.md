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

Evals, `just eval <plugin>` (`--ablation with-without`, n=3 per arm unless named):

| Run | Model | Result |
| --- | --- | --- |
| claudetto `2026-11-24T03-08-24-156Z` | Opus 5.5 | 19 cases, mean Δ +0.09, $56.81 |
| claudetto-spec `2026-11-24T03-08-24-158Z` | Opus 5.5 | 13 cases, mean Δ +0.13, $12.16 |
| claudetto `review-seeded-defects` `2026-11-24T03-31-47-957Z` | Haiku 5.5 | with 0.98, without 1.00: one run listed cleared changes under "Not reported:"; the conduct paragraph now names that list |
| claudetto-spec `spec-edit-*` `2026-11-24T03-31-47-947Z` | Haiku 5.5 | command path 0.99, skill path 0.87 |
| claudetto-spec `implement-conflict-exact` | Opus 5.5 | 1.00 against 1.00, $0.70: `implement-conflict` fails correct replies, because its DISC-2 example also splits from DISC-4 |

The result folders are local and gitignored.
