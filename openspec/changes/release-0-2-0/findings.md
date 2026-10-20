# Findings of the Surfaces of 0.2.0

This file is the report of task 1.2, and it is the list of D38 (`design-release.md:20`).
Each surface has one or more rows.
A row with the task `none` is a surface with no fault, and its check shows that it works.
A row with the task `new:` is a fault that no task of `tasks.md` covers, with a proposed task.

## Method

- Transcripts: each `.jsonl` file under `~/.claude/projects/` (3 project folders), read-only, with a Python scan.
  The scan counted the hook attachments, the `system` rows, the tool errors, and the user texts with complaint words.
  It found no claudetto deny, no claudetto hook error, and no claudetto `<system-reminder>` text.
  The one hook message (`525c20cb…jsonl:218`) is a tip of Claude Code.
  The `/handoff` text "no command.run hook answered it" (`47e8ce26…jsonl:640`) comes from the separate `handoff` plugin, not from claudetto.
  So the faults of the sessions of 2026-10-17 come from the facts of `design-handoff.md`, which another session recorded.
- Hook labs: one run of `bun tools/lab.ts`, with exit 0.
  Core: 146 pass in 19 files, `claudetto-browser`: 19 pass, `claudetto-codegraph`: 7 pass.
- Tests: one run of `bun test tests/`: 984 pass, 1 fail (see the repository tools).
- `bun tools/generate/index.ts --check` and `bun run validate` passed.
- `bin/` commands: each one ran with `--help`, with no argument, or with a bad argument, in a temp folder with `HOME` and `CLAUDE_CONFIG_DIR` in that folder.
  `claudetto-decide` and `claudetto-sandbox` (other than `--help`) did not run, because they call a model.

## Core Slices

| Surface | Fault | Source | Task | Check |
| --- | --- | --- | --- | --- |
| `advise` | none found with no model call | lab `tests/advise.test.ts` | none | `just test tests/claudetto/advise` |
| `decide` | none found with no model call, `claudetto-decide` not run | lab `ask`, `second-opinion`, `session` | none | `just test tests/claudetto/decide` |
| `goal` | none found | lab `goal`, `loop` | none | `just test tests/claudetto/goal` |
| `ground` | none found | lab `plan`, `trim-0-2-0/evidence-ground.md` | none | `just test tests/claudetto/ground` |
| `guard` | a read-only command with `$(( ))` and no `git` word was denied as `git.discard-uncommitted` | `design-handoff.md:15` | 3.6, done in `bd689f03` | `just test tests/claudetto/guard` |
| `guard` | the destructive `git` forms needed exact deny rules | `design-sandbox.md:22` | 7.10, 7.11, done in `1ddf5eb5` and `bc2562a3` | `just test tests/claudetto/guard` |
| `handoff` | a handoff went to the change folder, because `HANDOFF_DIR` was relative | `design-handoff.md:18` | 3.4, done in `bd689f03` | `just lab` |
| `handoff` | each handoff carried the full text of each earlier handoff | `design-handoff.md:96` | 3.10, done in `a194c7e8` | `just lab` |
| `handoff` | a compaction on a cold cache makes a model call | `design-handoff.md:117` (D47) | 3.11 | `just lab` |
| `handoff` | the done list can take a step that only the model text calls done | `design-handoff.md:125` (D48) | 3.12 | `just test tests/claudetto/handoff` |
| `handoff` | a cold handoff does not copy the open decisions | `design-handoff.md:135` (D50) | 3.13 | `just lab` |
| `handoff` | no measure of the handoff against the automatic compaction | `design-handoff.md:88` | 3.16 (paid) | the evidence file of 3.16 |
| `prompt` | the texts do not yet follow the audit | `prompt-audit.md` | 6.4 | `just test tests/claudetto/prompt` |
| `prompt` | no eval of D53 (short solution) | `design-prompts.md` (D53) | 6.10 | the eval of 6.10 at 10 runs |
| `sembr` | none found | lab `sembr`, D52 | none | `just test tests/claudetto/sembr` |
| `setup` | `--help` and a typo such as `--aply` run a dry run with no error, because the `bad` filter skips index 0 when `--scope` or `--advisor` is absent (`at + 1` and `adv + 1` are `0`), the same fault as task 1.1 | `src/plugins/claudetto/slices/setup/adapters/cli.ts:78`, run `claudetto-setup --aply` | new: add a test that `claudetto-setup --aply` and `claudetto-setup --help` return 2 with the usage, and see it fail, then fix the filter | `just test tests/claudetto/setup` |
| `setup` | setup cleans the keys of 0.1.0 (`cleanLegacyKeys`, `cleanAutoMode`, `cleanGitConfig`, and the `promptCacheTtl` of 7.2), and `CHANGELOG.md:16` says so, but D38 says that 0.2.0 migrates no state of 0.1.0 | `cli.ts:117`, `design-release.md:28` | new: decide between D38 and task 7.2, then remove the clean functions or change D38 | `just test tests/claudetto/setup` |
| `setup` | setup does not run `codegraph install` after a yes | `tasks.md` 6.9 | 6.9 | `just test tests/claudetto/setup` |
| `setup` | the sandbox step has no cache and build folders of the toolchains | `tasks.md` 7.4 | 7.4 | `just test tests/claudetto/setup` |
| `setup` | `just docker check` can fail in the sandbox of D43 (Docker socket) | `design-sandbox.md:22` | 7.14 | `just docker check` (main session) |
| `spec` | none found | `spec` skill, `tests/claudetto/spec` | none | `just test tests/claudetto/spec` |
| `spec` | this change keeps `specs/minispec-format/` and `specs/agent-roster/`, which describe removed parts | `openspec/changes/release-0-2-0/specs/` | new: remove or rewrite each spec of this change that names a removed part, then validate | `OPENSPEC_TELEMETRY=0 bunx --bun @fission-ai/openspec@1.14.3 validate release-0-2-0` |
| `statusline` | the context segment showed the window of 1M | `tasks.md` 5.1 | 5.1, 5.2 (checked) | `just test tests/claudetto/statusline` |
| `statusline` | `claudetto-statusline --help` waits on stdin with no end, and an empty stdin prints `claudetto hook failed: SyntaxError` and exits 0 | run, `src/plugins/claudetto/slices/statusline/adapters/cli.ts:121`, `src/kernel/node/hook-io.ts:38` | new: add a test that `--help` prints the usage, and that an empty stdin prints one line that names `claudetto-statusline`, then fix the CLI | `just test tests/claudetto/statusline` |
| `styles` | `Concise.md` does not limit the "What I Need from You" list to a turn that needs the user | `tasks.md` 3.15 | 3.15 | `just test tests/claudetto/styles` |

## Add-On Plugins

| Surface | Fault | Source | Task | Check |
| --- | --- | --- | --- | --- |
| `claudetto-browser` | none found, `claudetto-browser-guide` names the missing tool and exits 0 | lab `web-search` (19 pass), run | none | `just lab` |
| `claudetto-codegraph` | `claudetto-codegraph-check --help` prints the usage but exits 2 | run, `src/plugins/claudetto-codegraph/slices/graph/adapters/cli.ts:43` | new: make `--help` exit 0, with a test | `just test tests/claudetto-codegraph` |
| `claudetto-codegraph` | the hooks do nothing when `codegraph` is not on `PATH` (a clear notice, by design) | run `claudetto-codegraph-check` | 6.9 | `just lab` |
| `claudetto-docs` | none found (one skill, no hook) | `tests/claudetto-docs/docs.test.ts` | none | `just test tests/claudetto-docs` |
| `claudetto-lab` | none found, each `bin/` command gives its usage, and `claudetto-schema --out DIR` wrote both schemas | run | none | `just test tests/claudetto-lab` |
| `claudetto-sessions` | `replay.ts --help` fails with `Cannot find module …/--help`, because it imports the first argument | run, `src/plugins/claudetto-sessions/slices/sessions/skills/sessions/replay.ts:16` | new: print the usage for `--help` or a missing module, with a test | `just test tests/claudetto-sessions` |

## Settings Snippet and Setup

| Surface | Fault | Source | Task | Check |
| --- | --- | --- | --- | --- |
| snippet | the snippet set `promptCacheTtl` | `design-surfaces.md:27` (D18) | 7.2 (checked) | `just test tests/claudetto/setup` |
| snippet | a text named `TaskStop`, which the snippet denies | `design-handoff.md:8` | 3.3, 7.5, done in `bd689f03` | `just test tests/claudetto/prompt/denied-names.test.ts` |
| snippet | the names `promptCacheTtl` and `subagentPromptCacheTtl` have no recorded source | `tasks.md` 7.1 | 7.1 | `grep -n promptCacheTtl src/wiki/claudetto/rationale/Decisions-Session.md` |
| snippet | the `env` of the snippet is not pinned to `Env.md` | `tasks.md` 7.7, 7.8 | 7.7, 7.8 | `just test tests/claudetto/settings-pin.test.ts` |
| setup run | ran on a fresh config in task 12.4: 68 changes applied, and a second run changed nothing | 12.4 | (checked) | the evidence of 12.4 |

## Other Surfaces of D38

| Surface | Fault | Source | Task | Check |
| --- | --- | --- | --- | --- |
| hooks | none found in the labs, 172 pass | `bun tools/lab.ts` | none | `just lab` |
| agents | the core plugin ships no agent now | `plugins/claudetto/` | none | `just validate` |
| MCP tools | `advise` ran in task 12.4 and answered from `opus`. `second_opinion` and `--mcp` of `claudetto-codegraph-check` are not in 0.2.0 (D51), and the plain check exits 0 | 12.4 | (checked) | the evidence of 12.4 |
| `bin/` commands | see the rows of `setup`, `statusline`, `claudetto-codegraph`, and `claudetto-sessions` | runs | see those rows | see those rows |
| evals | a case can pass on reply words only | `tasks.md` 11.1 | 11.1, part done in `f6281c96` | `just validate` |
| evals | the cases and the wiki numbers are not proved at 10 runs | `tasks.md` 11.2, 11.3 | 11.2, 11.3 (paid) | `just validate` |
| evals | no case for the cleanup rule of D44 | `design-sandbox.md:48` | 11.7 (paid) | the eval of 11.7 |
| wiki | `dotclaude` is still in `src/wiki/claudetto/Overview.md`, `wiki/Home.md`, `wiki/Install.md`, and `wiki/archive/` | `git grep -l dotclaude` | 2.3 | `! git grep -qi dotclaude` |
| wiki | `wiki/archive/` has 41 files, and the hand-edited pages are not generated from `src/wiki/` | `ls wiki/archive` | 10.4 | `just generate --check` |
| wiki | pages longer than 150 lines | `design-trim.md:63` (D13) | 10.5 | `just validate` |
| `CHANGELOG.md` | the entries of this change are not complete | `tasks.md` 12.1 | 12.1 | `bun run lint:md` |
| `just generate` | none found | `bun tools/generate/index.ts --check` | none | `just generate --check` |
| `just bump` | `rest` dropped `args[0]` with no `--root` | `tasks.md` 1.1 | 1.1 (checked), run `bump minor --dry-run` exit 0 | `bun tools/bump-version.ts minor --dry-run` |
| `just docker` | the gate does not run in a container yet | `tasks.md` 12.3 | 7.14, 12.3 | `just docker check` (main session) |
| tests | `tests/support/prose-in-code.test.ts` spawns `node_modules/.bin/biome`, whose shebang needs `node`, so the test fails on a host with Bun only (`env: node: No such file or directory`, also in `47e8ce26…jsonl:65`) | `tests/support/prose-in-code.test.ts:76`, run of `bun test tests/` | new: spawn Biome with `bunx --bun biome`, as `tools/lint.ts:11` does, and run the test on a host with no `node` | `just test tests/support/prose-in-code.test.ts` |
| Reply button (D56) | task 2.4 has no plugin, because `claudetto-you-should-know` is removed | `design-surfaces.md:144`, `tasks.md` 2.4 | new: close 2.4 as obsolete, or name the plugin that holds the `Reply` mod | `grep -n "2.4" openspec/changes/release-0-2-0/tasks.md` |

## Sandbox Run of 12.4

One `just sandbox` session on a fresh config, on `claude-sonnet-5-5`, with `advisor` `claudetto` and `decide` `jev`, on 2026-10-20.

| Surface | Fault | Source | Task | Check |
| --- | --- | --- | --- | --- |
| `setup` | the model picked `--advisor claudetto` when the option was not set, so the user had no advisor | transcript `4e1a9957` | 13.7, done | `just test tests/claudetto/setup` |
| `setup` | the skill gave the count of changes, not the list, before it asked | transcript `4e1a9957` | 13.8, done | `just test tests/claudetto/setup` |
| `decide` | Jev picked a wrong option at confidence 0.76 with no facts | transcript `508abd63` | 13.9, done | `just test tests/claudetto/decide` |
| snippet | `Bash(rm -*R*)` asks for `rm -f $TMPDIR/m.mjs` | transcript `508abd63` | 13.10, done | `just test tests/claudetto/prompt` |
| `dry` | `bunx jscpd` fails in the sandbox with `EPERM` on the temp folder of Bun | transcript `508abd63` | 13.11, done, live run 2026-10-20 | `just test tests/claudetto/dry` |
| `dry` | a first scan stops, because no baseline exists | transcript `508abd63` | 13.12, done | `just test tests/claudetto/dry` |
| `spec` | an `openspec/` folder with no `/opsx:*` commands skips `openspec init` | transcript `508abd63` | 13.13, done | `just test tests/claudetto/spec` |
| `goal` | "1 steps" | transcript `508abd63` | 13.14, done | `just test tests/claudetto/goal` |
| snippet | `allowUnsandboxedCommands: true` let the model run `bunx` outside the sandbox twice with no prompt | transcript `508abd63` | 13.15, done | `just test tests/claudetto/prompt/sandbox-escape.test.ts` |
| `dry` | `BUN_TMPDIR="$TMPDIR" bunx jscpd` is rejected (quoted text) or needs approval (env prefix) | live run of 13.11 | 13.16, done | `just test tests/claudetto/dry` |
| snippet | `Bash(git push* :*)` mixes `*` with a trailing `:*`, so it matches nothing | live run of 13.11 | 13.17, done | `just test tests/claudetto/prompt tests/claudetto/guard` |
| `decide` | the kind gate sent most decisions to the user, though the user wants Jev to answer them | the user, 2026-10-20 | 13.18, done | `just test tests/claudetto/decide && just lab` |
| `guard`, `sembr`, `ground`, `patch`, `handoff`, `statusline`, `reply`, `styles`, `advise` | none found | transcript `508abd63` | none | the evidence of 12.4 |

## Not Checked

- `just docker check`, because the brief forbids it.
