# Review Findings of dotclaude 1.0.0

This file is a part of [the fault register](faults.md).
It holds the 138 confirmed findings of the 26 review files in `.dotclaude/spec/changes/1.1.0/evidence/review-<slice>.md`.
Each row has the slice, the title of the finding as the review gives it, and the first cite of the finding.
The source of each row is dotclaude.

Evidence:

- Each row has the tag `logs (review-<slice>.md)`, because the review runs found it.
- The column "Checked again" names the 11 rows that session `7af09a94` checked again (`findings.md`, section R).
- In this session, 135 first cites resolve to an existing line.
  `src/` has no commit after `efa073ce`, which is older than each review, so the line numbers hold.
  Rows 72 and 103 cite a file with no line, and row 99 records that no hook names `events.jsonl`.

| # | Slice | Finding | First cite | Evidence | Checked again |
| --- | --- | --- | --- | --- | --- |
| 1 | `agents-md` | F1. I17 and I14: a failed settings read loads an excluded file | `src/plugins/dcc-plugin-agents-md/slices/agents/adapters/mod.ts:58-65` | `logs (review-agents-md.md)` | |
| 2 | `agents-md` | F2. Smell, lost update: two parallel reads load one nested file twice | `src/plugins/dcc-plugin-agents-md/slices/agents/adapters/mod.ts:152-155` | `logs (review-agents-md.md)` | |
| 3 | `agents-md` | F3. I18: a trailing slash in a folder setting drops the file of that folder | `src/plugins/dcc-plugin-agents-md/slices/agents/domain/agents.ts:32-36` | `logs (review-agents-md.md)` | |
| 4 | `agents-md` | F4. I01, parse gap: `readPaths` ignores a read after a newline | `src/plugins/dcc-plugin-agents-md/slices/agents/domain/agents.ts:116` | `logs (review-agents-md.md)` | |
| 5 | `agents-md` | F5. I01, parse gap: `readPaths` splits a quoted path that has a space | `src/plugins/dcc-plugin-agents-md/slices/agents/domain/agents.ts:117` | `logs (review-agents-md.md)` | |
| 6 | `agents-md` | F6. I16, test that cannot fail: the `ls sub` lab test | `src/plugins/dcc-plugin-agents-md/slices/agents/lab/agents.test.ts:273-277` | `logs (review-agents-md.md)` | |
| 7 | `agents-md` | F7. Dead code: the type `Seen` | `src/plugins/dcc-plugin-agents-md/slices/agents/domain/agents.ts:39` | `logs (review-agents-md.md)` | |
| 8 | `agents` | I18, I08: `search-route` names a tool that the agents do not have | `src/fragments/search-route.md:1` | `logs (review-agents.md)` | |
| 9 | `agents` | I16: the answer graders pass a list of all the files | `src/plugins/dotclaude/slices/agents/evals/delegation-related-grouped/case.yaml:19-34` | `logs (review-agents.md)` | |
| 10 | `agents` | I16: the `Agent` graders do not check the agent type | `src/plugins/dotclaude/slices/agents/evals/big-file-subagent/case.yaml:19-22` | `logs (review-agents.md)` | |
| 11 | `agents` | I15, a test of prose: `no-worktree-add.test.ts` checks words | `tests/dotclaude/agents/no-worktree-add.test.ts:11` | `logs (review-agents.md)` | |
| 12 | `agents` | I07, I02: `planner` can write outside `.dotclaude/spec/` | `src/plugins/dotclaude/slices/agents/slice.ts:11` | `logs (review-agents.md)` | |
| 13 | `agents` | A bound outside its `limits.ts`: `REPORT_MAX_WORDS` | `src/plugins/dotclaude/slices/handoff/limits.ts:17` | `logs (review-agents.md)` | |
| 14 | `asks` | F1: I05, a weakening edit of a test file over `FILE_MAX_BYTES` gets no ask | `src/plugins/dotclaude/slices/asks/adapters/mod.ts:27` | `logs (review-asks.md)` | |
| 15 | `asks` | F2: I14 and a bound outside `limits.ts`, `weak-limits.ts` is not protected | `src/plugins/dotclaude/slices/asks/weak-limits.ts:6` | `logs (review-asks.md)` | |
| 16 | `attribution` | F1: I17 and I05, an unreadable command read as "not a commit" | `src/plugins/dotclaude/slices/attribution/domain/shell.ts:14` | `logs (review-attribution.md)` | |
| 17 | `attribution` | F2: I17, a here-string commit gets no trailer | `src/plugins/dotclaude/slices/attribution/domain/shell.ts:97` | `logs (review-attribution.md)` | |
| 18 | `attribution` | F3: Copy of kernel code, a second shell reader with no wrapper strip | `src/kernel/shell.ts:1` | `logs (review-attribution.md)` | |
| 19 | `attribution` | F4: Copy of kernel code and I18, a model id that the kernel parses gives `Claude` | `src/plugins/dotclaude/slices/attribution/domain/lines.ts:14` | `logs (review-attribution.md)` | |
| 20 | `attribution` | F5: I08 and dead code, an option that `git commit` does not have | `src/plugins/dotclaude/slices/attribution/domain/call.ts:22` | `logs (review-attribution.md)` | |
| 21 | `browser` | F1. I10 and I07: a browser answer skips the permission check of `WebSearch` | `src/plugins/dotclaude-browser/slices/search/adapters/mod.ts:175-176` | `logs (review-browser.md)` | code read |
| 22 | `browser` | F2. I18: the hook drops domain filters with no notice | `src/plugins/dotclaude-browser/slices/search/domain/search.ts:36-40` | `logs (review-browser.md)` | |
| 23 | `browser` | F3. I14: the default backend uses CloakBrowser with no consent | `src/plugins/dotclaude-browser/slices/search/adapters/mod.ts:109-112` | `logs (review-browser.md)` | code read |
| 24 | `browser` | F4. I10 and I07: `allowed-tools` grants each `agent-browser` command | `src/plugins/dotclaude-browser/slices/browse/skills/browse/SKILL.md:4` | `logs (review-browser.md)` | code read |
| 25 | `browser` | F5. I17 and silent `catch`: a failed close leaves the browser for one hour | `src/plugins/dotclaude-browser/slices/search/adapters/mod.ts:77-82` | `logs (review-browser.md)` | |
| 26 | `browser` | F6. Smell, an over-broad detector: a results page reads as a bot check | `src/plugins/dotclaude-browser/slices/search/domain/search.ts:34` | `logs (review-browser.md)` | |
| 27 | `browser` | F7. I18: an `extended` search gets one page with no notice | `src/plugins/dotclaude-browser/slices/search/adapters/mod.ts:169-176` | `logs (review-browser.md)` | |
| 28 | `browser` | F8. Smell, a bound outside `limits.ts`: the length of a session name | `src/plugins/dotclaude-browser/slices/search/domain/search.ts:61` | `logs (review-browser.md)` | |
| 29 | `checks` | 1. I07 and I10: the CLI lets a command get past the guard floor (blocking) | `src/plugins/dotclaude/slices/checks/adapters/cli.ts:76-81` | `logs (review-checks.md)` | |
| 30 | `checks` | 2. I04 recipe 2: a pipe gives a false pass (should-fix) | `src/plugins/dotclaude/slices/checks/adapters/cli.ts:76` | `logs (review-checks.md)` | |
| 31 | `checks` | 3. I17: a timeout leaves the child processes running (should-fix) | `src/plugins/dotclaude/slices/checks/adapters/cli.ts:80` | `logs (review-checks.md)` | |
| 32 | `checks` | 4. I16: `constructor` counts as a count word (nit) | `src/plugins/dotclaude/slices/checks/domain/counts.ts:36` | `logs (review-checks.md)` | |
| 33 | `checks` | 5. I15: tests of prose (nit) | `tests/dotclaude/checks/run.test.ts:285` | `logs (review-checks.md)` | |
| 34 | `checks` | 6. A copy of a bound in a test (nit) | `tests/dotclaude/checks/run.test.ts:239` | `logs (review-checks.md)` | |
| 35 | `codegraph` | F1. I17: the check reads a failed CLI call as a missing CLI | `src/plugins/dotclaude-codegraph/slices/graph/adapters/cli.ts:15` | `logs (review-codegraph.md)` | |
| 36 | `codegraph` | F2. I09 and I12: `TREE_CHANGE` is a second shell parser that misses forms | `src/plugins/dotclaude-codegraph/slices/graph/domain/graph.ts:43-45` | `logs (review-codegraph.md)` | |
| 37 | `codegraph` | F3. I17 and I04: the background hook timeout does not cover the sync | `src/plugins/dotclaude-codegraph/slices/graph/limits.ts:18` | `logs (review-codegraph.md)` | |
| 38 | `codegraph` | F4. I17: two syncs run on one index at the same time | `src/plugins/dotclaude-codegraph/slices/graph/adapters/hook.ts:39-50` | `logs (review-codegraph.md)` | |
| 39 | `codegraph` | F5. I15: a test checks the words of the session line | `tests/codegraph/session.test.ts:22-29` | `logs (review-codegraph.md)` | |
| 40 | `codegraph` | F6. Bound outside `limits.ts`: the 1 s hook margin | `tests/codegraph/timeouts.test.ts:12` | `logs (review-codegraph.md)` | |
| 41 | `decide` | F1. Correctness: duplicate option keys pass the input check | `src/plugins/dotclaude/slices/decide/domain/request.ts:45` | `logs (review-decide.md)` | |
| 42 | `decide` | F2. I16: the eval entry says that the hook sends 0 model requests | `src/plugins/dotclaude/slices/decide/slice.ts:30-38` | `logs (review-decide.md)` | |
| 43 | `decide` | F3. Dead code: nothing reads `TOOL_NAME` | `src/plugins/dotclaude/slices/decide/domain/tool.ts:10` | `logs (review-decide.md)` | |
| 44 | `decide` | F4. Bound outside `limits.ts` | `src/plugins/dotclaude/slices/decide/domain/ask.ts:45` | `logs (review-decide.md)` | |
| 45 | `decide` | F5. Silent `catch`: the CLI error is lost | `src/plugins/dotclaude/slices/decide/adapters/jev.ts:25-32` | `logs (review-decide.md)` | |
| 46 | `docs` | F1. I08: The Skill Runs an Unpinned `ctx7@latest` | `src/plugins/dotclaude-docs/slices/docs/skills/docs/SKILL.md:4` | `logs (review-docs.md)` | |
| 47 | `docs` | F2. I10 and I07: The Permission Rule Allows the Write Subcommands of `ctx7` | `src/plugins/dotclaude-docs/slices/docs/skills/docs/SKILL.md:4` | `logs (review-docs.md)` | |
| 48 | `docs` | F3. I01: The Skill Gets the Latest Docs, Not the Docs of the Project Version | `src/plugins/dotclaude-docs/slices/docs/skills/docs/SKILL.md:22` | `logs (review-docs.md)` | |
| 49 | `docs` | F4. I18: The Settings Snippet Allows a Different Command | `src/fragments/docs-snippet.json:5` | `logs (review-docs.md)` | |
| 50 | `docs` | F5. I18: The Add-on Check Reads `npx`, but the Skill Runs `bunx` | `src/plugins/dotclaude/slices/setup/domain/addons.ts:66` | `logs (review-docs.md)` | |
| 51 | `docs` | F6. Smell, Bound Outside `limits.ts`: The Call Bound Is Prose Only | `src/plugins/dotclaude-docs/slices/docs/skills/docs/SKILL.md:30` | `logs (review-docs.md)` | |
| 52 | `guard` | I10 over-refusal: a `git` global option with a separate value reads as a substitution | `src/plugins/dotclaude/slices/guard/domain/matchers/git.ts:121` | `logs (review-guard.md)` | |
| 53 | `guard` | I10 over-refusal: the file-print deny of a compound command (P144) | `src/plugins/dotclaude/slices/guard/domain/reads.ts:131-148` | `logs (review-guard.md)` | |
| 54 | `handoff` | Dead code: `resetState` | `src/plugins/dotclaude/slices/handoff/adapters/mod.ts:86` | `logs (review-handoff.md)` | |
| 55 | `handoff` | Test that cannot fail: the `off` reset of `wanted` | `src/plugins/dotclaude/slices/handoff/lab/resume-flow.test.ts:113-135` | `logs (review-handoff.md)` | |
| 56 | `handoff` | I17: a tool error is read as "no file" | `src/plugins/dotclaude/slices/handoff/adapters/mod.ts:106` | `logs (review-handoff.md)` | |
| 57 | `handoff` | I15: a test pins the words of the hint | `src/plugins/dotclaude/slices/handoff/lab/handoff.test.ts:121-123` | `logs (review-handoff.md)` | |
| 58 | `kernel` | F1. I07, I18: `env -S` and BSD `env -P` hide the command | `src/kernel/wrappers.ts:26` | `logs (review-kernel.md)` | run |
| 59 | `kernel` | F2. I07: an ANSI-C quote hides the next commands | `src/kernel/shell/scan.ts:127` | `logs (review-kernel.md)` | run |
| 60 | `kernel` | F3. I07: a heredoc delimiter with a quote inside it | `src/kernel/shell/scan.ts:134` | `logs (review-kernel.md)` | |
| 61 | `kernel` | F4. I07, I18: `noglob`, `coproc`, and `caffeinate` are not wrappers | `src/kernel/wrappers.ts:5` | `logs (review-kernel.md)` | |
| 62 | `kernel` | F5. I07: a command name that the reader cannot see reads as no command | `src/kernel/shell/scan.ts:69` | `logs (review-kernel.md)` | |
| 63 | `kernel` | F6. I17: a read error is read as an absent file | `src/kernel/node/fs.ts:84` | `logs (review-kernel.md)` | |
| 64 | `kernel` | F7. Silent `catch`: each parser error becomes a YAML problem | `src/kernel/rules.ts:79` | `logs (review-kernel.md)` | |
| 65 | `kernel` | F8. Copy of slice code: `node/paths.ts` has no importer | `src/kernel/budget.ts:29` | `logs (review-kernel.md)` | |
| 66 | `kernel` | F9. Dead code: four constants have no reader | `src/kernel/budget.ts:29` | `logs (review-kernel.md)` | |
| 67 | `kernel` | F10. Bound outside `budget.ts`: `MAX_PATTERNS` | `src/kernel/rules.ts:7` | `logs (review-kernel.md)` | |
| 68 | `lab` | F1. I16: the frontmatter check passes when no plugin loaded | `src/plugins/dotclaude-lab/slices/sandbox/domain/frontmatter.ts:14` | `logs (review-lab.md)` | |
| 69 | `lab` | F2. I16 and I18: eval-compare reads exit 0 as a valid comparison | `src/plugins/dotclaude-lab/slices/eval-compare/domain/compare.ts:30` | `logs (review-lab.md)` | |
| 70 | `lab` | F3. I18: a count reply with no `input_tokens` gives `NaN` | `src/plugins/dotclaude-lab/slices/capture/domain/report.ts:196` | `logs (review-lab.md)` | |
| 71 | `lab` | F4. Smell, a bound outside `limits.ts` | `src/plugins/dotclaude-lab/slices/capture/domain/report.ts:38` | `logs (review-lab.md)` | |
| 72 | `lab` | F5. Smell, a repository tool ships in `plugins/` | `src/plugins/dotclaude-lab/slices/sandbox/adapters/start-run.ts` | `logs (review-lab.md)` | |
| 73 | `prompt` | F1 (I02, Contract): `prompt.compose` Ignores the `DISABLE_COMPACT` Gate | `src/plugins/dotclaude/slices/prompt/adapters/mod.ts:22-25` | `logs (review-prompt.md)` | code read |
| 74 | `prompt` | F2 (I01): A Spawn With No `model` Gets the Block of the Parent Model | `src/plugins/dotclaude/slices/prompt/adapters/mod.ts:35` | `logs (review-prompt.md)` | code read |
| 75 | `prompt` | F3 (I10): Each Variant Drops the `intro` Rules | `src/plugins/dotclaude/slices/prompt/domain/apply.ts:21-29` | `logs (review-prompt.md)` | code read |
| 76 | `prompt` | F4 (Smell, a Bound Outside `limits.ts`): Unpinned Copies of Kernel Bounds | `src/plugins/dotclaude/slices/prompt/slice.ts:55` | `logs (review-prompt.md)` | |
| 77 | `rules` | F1. I18, tool output misread: `git ls-files` quoting hides non-ASCII files | `src/plugins/dotclaude/slices/rules/skills/rules-creator/scripts/check-globs.ts:88` | `logs (review-rules.md)` | |
| 78 | `rules` | F2. Smell: a bound outside `limits.ts`, with an unpinned copy | `src/plugins/dotclaude/slices/rules/skills/rules-creator/scripts/check-globs.ts:11` | `logs (review-rules.md)` | |
| 79 | `rules` | F3. Smell: a symlink cycle reads one rule two times (nit) | `src/plugins/dotclaude/slices/rules/skills/rules-creator/scripts/check-globs.ts:116-120` | `logs (review-rules.md)` | |
| 80 | `sembr` | 1. I18: the repair of `old_string` fails on a list item or a quote line | `src/plugins/dotclaude/slices/sembr/domain/rewrite.ts:79` | `logs (review-sembr.md)` | |
| 81 | `sembr` | 2. I18: a CRLF file loses the front matter guard and gets mixed line endings | `src/plugins/dotclaude/slices/sembr/domain/split.ts:117` | `logs (review-sembr.md)` | |
| 82 | `sessions` | F1. I16: an unparsed model id sets the token counts to zero | `src/plugins/dotclaude-sessions/slices/usage/domain/parse.ts:73` | `logs (review-sessions.md)` | |
| 83 | `sessions` | F2. I16: the report uses the label "main turns" for two different counts | `src/plugins/dotclaude-sessions/slices/usage/domain/scan.ts:168` | `logs (review-sessions.md)` | |
| 84 | `sessions` | F3. I16: `--text-max` passes when the transcript has no snapshot | `src/plugins/dotclaude-sessions/slices/start-cost/domain/report.ts:131` | `logs (review-sessions.md)` | |
| 85 | `sessions` | F4. I17: when the transcript has no data, the bin gives the status of a failed bound | `src/plugins/dotclaude-sessions/slices/start-cost/domain/report.ts:107-112` | `logs (review-sessions.md)` | |
| 86 | `sessions` | F5. Smell, a test that cannot fail: the check of the difference | `tests/sessions/start/report.test.ts:128` | `logs (review-sessions.md)` | |
| 87 | `sessions` | F6. Smell, a bound outside `limits.ts`: `TIMEOUT_MS` | `src/plugins/dotclaude-sessions/slices/start-cost/adapters/mod.ts:13` | `logs (review-sessions.md)` | |
| 88 | `sessions` | F7. Smell, dead code: three exports that nothing uses | `src/plugins/dotclaude-sessions/slices/usage/domain/transcript.ts:122` | `logs (review-sessions.md)` | |
| 89 | `sessions` | F8. Smell, a comment that does not agree with the code: `--text-min` | `src/plugins/dotclaude-sessions/slices/start-cost/adapters/cli.ts:6` | `logs (review-sessions.md)` | |
| 90 | `setup` | F1. I18: `git ls-files` output is quoted for a non-ASCII path | `src/plugins/dotclaude/slices/setup/adapters/rules-check.ts:12` | `logs (review-setup.md)` | |
| 91 | `setup` | F2. I17: a git failure counts as "no files" | `src/plugins/dotclaude/slices/setup/adapters/rules-check.ts:15-17` | `logs (review-setup.md)` | |
| 92 | `setup` | F3. I04 and I07: `--apply` writes `.git/info/exclude` before it checks the call | `src/plugins/dotclaude/slices/setup/adapters/cli.ts:38-43` | `logs (review-setup.md)` | |
| 93 | `setup` | F4. I04: a `null` settings file gives "No difference" | `src/plugins/dotclaude/slices/setup/adapters/drift-cmd.ts:27` | `logs (review-setup.md)` | |
| 94 | `setup` | F5. I15, test of prose: assertions on the words of the note | `tests/dotclaude/setup/session-start.test.ts:116-213` | `logs (review-setup.md)` | |
| 95 | `setup` | F6. Test that cannot fail: `session-start.test.ts:181` | `tests/dotclaude/setup/session-start.test.ts:181` | `logs (review-setup.md)` | |
| 96 | `setup` | F7. Bound outside `limits.ts` | `src/plugins/dotclaude/slices/setup/adapters/exclude-step.ts:22` | `logs (review-setup.md)` | |
| 97 | `setup` | F8. Dead code: `SCOPES` | `src/plugins/dotclaude/slices/setup/domain/settings.ts:17` | `logs (review-setup.md)` | |
| 98 | `spec` | F1. I04 and I05: `validate` does not replay the log | `src/plugins/dotclaude/slices/spec/adapters/validate.ts:108-119` | `logs (review-spec.md)` | |
| 99 | `spec` | F2. I05: no guard stops a direct write to `events.jsonl` | none (no hook names `events.jsonl`) | `logs (review-spec.md)` | |
| 100 | `spec` | F3. I04: `validate` does not check that a `verify` field can run | `src/plugins/dotclaude/slices/spec/domain/front.ts:26` | `logs (review-spec.md)` | run |
| 101 | `spec` | F4. I18: the fixtures take the global git config | `tests/dotclaude/spec/cli/run-phase.ts:47-55` | `logs (review-spec.md)` | |
| 102 | `spec` | F5. Smell: a package file with no `id` drops out silently | `src/kernel/spec-store.ts:133-157` | `logs (review-spec.md)` | |
| 103 | `spec` | F6. I04: the release does not accept the change | `tools/release.ts` | `logs (review-spec.md)` | |
| 104 | `spec` | F7. Smell: bounds outside `limits.ts` | `src/plugins/dotclaude/slices/spec/adapters/verify.ts:25` | `logs (review-spec.md)` | |
| 105 | `spec` | F8. Nit: `activeProgress` sorts ids as text | `src/kernel/spec-store.ts:65` | `logs (review-spec.md)` | |
| 106 | `stamp` | F1. I18: the transcript folder differs from Claude Code for a long `cwd` | `src/plugins/dotclaude/slices/stamp/domain/build.ts:86` | `logs (review-stamp.md)` | |
| 107 | `stamp` | F2. Silent catch: the outer `catch` at `adapters/mod.ts:163-167` | `src/plugins/dotclaude/slices/stamp/adapters/mod.ts:163-167` | `logs (review-stamp.md)` | |
| 108 | `stamp` | F3. Copy of kernel code: `.claude` at `adapters/mod.ts:51` | `src/plugins/dotclaude/slices/stamp/adapters/mod.ts:51` | `logs (review-stamp.md)` | |
| 109 | `statusline` | F1. I16: the change segment shows only `done` | `src/plugins/dotclaude/slices/statusline/segments.ts:65` | `logs (review-statusline.md)` | |
| 110 | `statusline` | F2. I18: the snapshot tests depend on `TZ` | `src/plugins/dotclaude/slices/statusline/domain/format.ts:26` | `logs (review-statusline.md)` | |
| 111 | `statusline` | F3. I17: a `git` error reads as "no repository" | `src/plugins/dotclaude/slices/statusline/adapters/git-cache.ts:109-119` | `logs (review-statusline.md)` | |
| 112 | `statusline` | F4. Silent catch | `src/plugins/dotclaude/slices/statusline/adapters/git-cache.ts:137` | `logs (review-statusline.md)` | |
| 113 | `statusline` | F5. Dead code | `src/plugins/dotclaude/slices/statusline/domain/pace.ts:46` | `logs (review-statusline.md)` | |
| 114 | `styles` | F1. I16: `readme-line` Cannot Fail | `src/plugins/dotclaude/slices/styles/evals/accusation-warranted/scaffold.sh:10-12` | `logs (review-styles.md)` | |
| 115 | `styles` | F2. I15: `birthday-fixed` Checks Text, Not the Fix | `src/kernel/slice.ts:109` | `logs (review-styles.md)` | |
| 116 | `styles` | F3. I15: `abs-fixed` Accepts Wrong Fixes | `src/kernel/slice.ts:109` | `logs (review-styles.md)` | |
| 117 | `styles` | F4. Tool Error Read as a Positive (I17): `npm test` Counts as a Check | `src/plugins/dotclaude/slices/styles/evals/verification-claim/scaffold.sh:5-9` | `logs (review-styles.md)` | |
| 118 | `styles` | F5. I15: `claim-states-result` Pins Words | `src/kernel/slice.ts:109` | `logs (review-styles.md)` | |
| 119 | `styles` | F6. Test That Cannot Fail: `keep-coding-instructions` | `src/plugins/dotclaude/slices/styles/slice.ts:2-3` | `logs (review-styles.md)` | |
| 120 | `styles` | F7. Dead Code: `outputStyles` | `src/plugins/dotclaude/slices/styles/slice.ts:10` | `logs (review-styles.md)` | |
| 121 | `surface` | F1. I18: the `Bash` text states facts that Claude Code computes per run | `src/plugins/dotclaude/slices/surface/domain/tools.ts:32-48` | `logs (review-surface.md)` | |
| 122 | `tools` | F1. I17: Two runs take a stale eval lock at the same time | `tools/lock.ts:51-54` | `logs (review-tools.md)` | |
| 123 | `tools` | F2. I17: The lock frees itself while the paid eval still runs | `tools/lock.ts:43` | `logs (review-tools.md)` | |
| 124 | `tools` | F3. I07 and I08: A mistyped dry run of `release.ts` makes and pushes tags | `tools/release.ts:36` | `logs (review-tools.md)` | code read |
| 125 | `tools` | F4. I07 and I08: A mistyped dry run of `bump-version.ts` writes the files | `tools/bump-version.ts:90-92` | `logs (review-tools.md)` | code read |
| 126 | `tools` | F5. I16: `just eval-variant` deletes the traces of its two paid arms | `tools/eval-variant.ts:66-76` | `logs (review-tools.md)` | |
| 127 | `tools` | F6. Bound outside `tools/limits.ts`: The cost bound of `just eval` | `tools/generate/stray.ts:9-28` | `logs (review-tools.md)` | |
| 128 | `tools` | F7. Smell, tool output read as a negative: The stray check misses quoted file names | `tools/generate/stray.ts:9-28` | `logs (review-tools.md)` | |
| 129 | `trim` | F1. I09, dead code: the `trim` domain has no runtime caller | `src/plugins/dotclaude/slices/trim/domain/removed.ts:16` | `logs (review-trim.md)` | |
| 130 | `trim` | F2. I09, copy of kernel code: `rulesAtStart` only wraps `src/kernel/rules.ts` | `src/plugins/dotclaude/slices/trim/domain/sources.ts:36-41` | `logs (review-trim.md)` | |
| 131 | `trim` | F3. I15, test of prose: a `trim` test pins the words of a string | `tests/dotclaude/trim/sources.test.ts:9-13` | `logs (review-trim.md)` | |
| 132 | `you-should-know` | F1. Smell, a test that cannot fail: the repeat and ask tests of the lab | `src/plugins/dcc-plugin-you-should-know/slices/notice/lab/notice.test.ts:298-322` | `logs (review-you-should-know.md)` | |
| 133 | `you-should-know` | F2. I12: two model calls in one turn | `src/plugins/dcc-plugin-you-should-know/slices/notice/adapters/mod.ts:201-203` | `logs (review-you-should-know.md)` | |
| 134 | `you-should-know` | F3. I12: the eval bound understates the cost | `src/plugins/dcc-plugin-you-should-know/slices/notice/slice.ts:48-53` | `logs (review-you-should-know.md)` | |
| 135 | `you-should-know` | F4. I15: the `NONE` keyword oracle on a free answer | `src/plugins/dcc-plugin-you-should-know/slices/notice/domain/notice.ts:179` | `logs (review-you-should-know.md)` | |
| 136 | `you-should-know` | F5. I07: some writes count as reads | `src/plugins/dcc-plugin-you-should-know/slices/notice/domain/notice.ts:62` | `logs (review-you-should-know.md)` | |
| 137 | `you-should-know` | F6. Smell, a silent catch: a failed check leaves no trace | `src/plugins/dcc-plugin-you-should-know/slices/notice/adapters/mod.ts:204-211` | `logs (review-you-should-know.md)` | |
| 138 | `you-should-know` | F7. I10: the fork prompt has no data rule | `src/plugins/dcc-plugin-you-should-know/slices/notice/domain/notice.ts:124` | `logs (review-you-should-know.md)` | |
