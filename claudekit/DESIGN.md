# claudekit design

Written 2026-11-05 for `GOAL-1.txt`, against Claude Code 2.1.318 and Bun 1.4.4 (`claude --version`, `bun --version`, read this session). Each fact about Claude Code that a module relies on carries its hypothesis, prediction, command, and result (section "Facts"). A claim with no run is marked **hypothesis**.

## Why the kit exists

On 2026-11-05 `/tmp` held 63 `probe-*` folders (`ls -d /tmp/probe-* | wc -l` = 63). A scan of their scripts (`find /tmp/probe-* -maxdepth 3 …`, 237 files outside plugin copies) found:

| need | copies or callers | what broke | source |
| --- | --- | --- | --- |
| fake Messages API (`Bun.serve`) | 15 files; 9 named `fake.ts`, 3 `server.ts`, 3 `serve.ts` | same-process `spawnSync` hang, 6 sessions × 120 s; one id `msg_fake` merged tool calls | `ISSUES.md:522`, `ISSUES.md:526` |
| clean launch (`env -i`) | 33 files; `/tmp/probe-fake/bin/run.sh` and `ovrun.sh` are the same script; 66 session commands call them | one global `/tmp/probe-fake/current` file names the run, so two runs at once write into one folder; `rm -rf req/$name` deletes the last run's evidence | `/tmp/probe-fake/bin/run.sh:9-10` |
| TUI driver (`expect`) | 15 `.exp` files, 74 session commands `expect -f` | a driver blocked on a full pty after its deadline | `ISSUES.md:534` |
| request differ | `msgdiff.ts`, `sysdiff.ts` (2), `textdiff.ts`, `prefix.ts` (2), `cmp.ts` (2); 16 + 13 session commands | each scrubbed its own fields; a merged-id prefix read as a cache break | `ISSUES.md:526` |
| grader | 45 session commands run a `grade.ts` | 15 scripts read `.result`; the opener grader graded the tail of 3 of 40 replies; a lone regex missed "Correction: I was wrong, and you are right." | `settings-review.txt:3410-3412`, `GOAL-1.txt` |
| stop a process | 30 session commands use `pkill`, 19 `pkill -f` | `pkill -f PATTERN` can match another session's process | `/tmp/probe-*` session scan below |
| fixed `/tmp` run folders | 22 session commands `rm -rf /tmp/probe…` | the sandbox refuses `mkdtemp '/tmp/claudetto-capture-…'` with `EPERM` | `ISSUES-2026-11-04-0934.md:254-258` |
| option types | one paid run | `handoverTokens` passed as `"16000"`, host refused the options, 52,559 paid tokens for a run with no plugin | `ISSUES.md:451` |
| price | `compaction-cost` | a compaction priced as a cache hit without the cache write | `ISSUES.md:530` |
| bound before a paid run | one paid run | 895k tokens against an approved 150k, found after the fact | `ISSUES.md:458-466` |

Session scan: every `Bash` command in the 24 transcripts of `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/` and its `Downloads` twin, extracted with `jq` (57,138 commands), counted with `grep -cE` per pattern: `claude -p` 123, `--debug-file` 82, `ANTHROPIC_BASE_URL=` 89, `CLAUDE_CONFIG_DIR=` 98, `env -i` 35, `tmux new|send-keys` 49, `.exp` 166, `count_tokens` 7, `.result` 65, `total_cost_usd` 78.

The dossier names the general failures and the recipe (`external/please-use-me-often/agent-failure-dossier/07-measurement-and-environment.md:22-74`, I16): wrong arm (`:33-35`), wrong instrument (`:36-39`), lopsided rule (`:40`), a case that cannot separate the arms (`:41`), destroyed evidence (`:42`), thin samples (`:43`). The recipe (`:66-72`) maps to modules: assert the arm → `arm`; keep traces → `workspace`; test the grader → `grade` fixtures; symmetric rules → `ab/stats`; separation check → `ab/report`.

`claudekit/openings/` was a check nobody asked for and was deleted (`ISSUES.md:500`). The kit ships no reply-opening check of its own; the opener grader exists only as the port that the goal names.

The old kit (`~/.claude/plugins/marketplaces/claudetto/claudekit/`, removed in `f4fdf73a`) was read for its needs. No file is copied from it.

## Facts about Claude Code the kit relies on

All runs at $0 on a throwaway fake under `$TMPDIR/probe-design/`(`fake.ts`,`run.sh`), 2.1.318,`claude-haiku-5-5` id. The kit's own tests repeat each one against the kit's fake.

| # | hypothesis | prediction | command | result |
| --- | --- | --- | --- | --- |
| F1 | `ANTHROPIC_BASE_URL` plus a dummy `ANTHROPIC_API_KEY` sends every `-p` request to the fake | the fake saves one body per request | `sh run.sh devnull empty.json json` | held: 1 request saved, `grep -c 'API REQUEST' debug.log` = 1 |
| F2 | after a `max_tokens` stop the CLI continues, and `--output-format json` `.result` holds only the last segment | `.result` = second segment, `num_turns` 2 | `sh run.sh cap-json cap.json json` (plan: `max_tokens` "PART-ONE…", then `end_turn` "PART-TWO tail.") | held: `{"result":"PART-TWO tail.","num_turns":2}` |
| F3 | stream-json carries every segment as its own `assistant` frame | two frames, ids `msg_a`, `msg_b` | `sh run.sh cap-stream cap.json stream-json --verbose` | held: `["msg_a","PART-ONE first segment."]`, `["msg_b","PART-TWO tail."]`; its `result` frame also holds only the tail |
| F4 | `--output-format json --verbose` prints an array of every frame | array of types | `sh run.sh vjson cap.json json --verbose` | held: `["system","assistant","user","assistant","result"]` |
| F5 | one answer with two text blocks comes out as one frame per block, same id | two frames `msg_m` | `sh run.sh multi multi.json stream-json --verbose` | held: `["msg_m",["BLOCK-A."]]`, `["msg_m",["BLOCK-B."]]` |
| F6 | two answers that share a message id merge into one assistant message | the third request of the shared-id run holds fewer messages | `sh run.sh id-same …` against `id-uniq` (two Bash calls, allow Bash) | held: 5 messages against 8; `ISSUES.md:526` held |
| F7 | `-p` appends piped stdin to the prompt | a stdin line appears in the request | `sh run-stdin.sh stdin empty.json json` | held: 1 of 1 requests holds `LEAKED-STDIN-LINE` |
| F8 | `--no-session-persistence` writes no transcript | `cfg/projects` holds no file | `find devnull/cfg/projects -type f` | held: none (the folder exists, empty) |
| F9 | the request's `messages` can hold `role: "system"` entries | — (seen, not predicted) | `jq '.messages[].role'` on `id-uniq`'s last request | observed: `["user","system","assistant","user","system",…]`; the environment block and `<total_tokens>` ride in them |
| F10 | the output style shows in the system text as `# Output Style: <name>` | one line | `sh run.sh ostyle empty.json json --settings '{"outputStyle":"Explanatory"}'` | held, in a `role: "system"` message, not in `body.system`: `$TMPDIR/probe-design/ostyle/req/001.json` has 0 matches in `.system` and 1 in the system messages; `src/arm/arm.test.ts` failed with "output style: want \"Explanatory\" got undefined" while `assertArm` read `.system` only |
| F11 | the debug log names each loaded plugin, its hooks module and events, and its agents, skills, and commands | lines of known shapes | read of `/tmp/probe-opener/old/cur-complaint-1.debug` | observed: `Loaded inline plugin from path: claudetto`, `hooks module claudetto@inline loaded (…); events: …`, `Loaded 4 agents from plugin claudetto default directory`, `Loaded 1 skills from plugin claudetto …`, `Loaded 2 commands from plugin claudetto …`, `[API REQUEST] /v1/messages` |
| F12 | a hook's timing shows as `hooks module NAME settings.read settled in Xms` | one line per settle | `grep settled /tmp/probe-fsx/fr-par-1.debug` | held: `claudetto@inline settings.read settled in 36.8ms (worker hop, next() included)` |
| F13 | plugin options are read from `--settings` `pluginConfigs[name].options` and typed by `userConfig` in `plugin.json` | — | debug line of `cur-complaint-1.debug` and `jq .userConfig /tmp/probe-opener/cur/.claude-plugin/plugin.json` | observed: "no pluginConfigs["claudetto" or "claudetto@inline"].options in user, --settings or managed settings"; `userConfig` entries carry `type` (`string`, `boolean`, `number`) |
| F14 | `total_cost_usd` is the list price from the pricing table | `cur-fact-1`: 2 in, 1,604 1h write, 1,641 read, 777 out on Opus 5.5 = $0.0287082 | arithmetic against `jq .total_cost_usd` | held: $0.0287082 both; kept as `src/ledger/ledger.test.ts` |
| F15 | a 400 from the API ends a `-p` run as an error | one request, `is_error: true` | kit fake, plan `[400 invalid_request_error]`, then text fallback | refuted: the CLI resent the request once (`[WARN] [thinking] HTTP 400 that no earlier recovery took; sending the request again without the thinking-token-count-2026-05-13 beta`), got the fallback, and succeeded. An error fixture must repeat; both cases are tests in `src/fake/fake.test.ts` |
| F16 | the launcher's stdin `ignore` is what keeps a parent's stdin out of the prompt | with `stdin: "inherit"` the stdin test fails | mutation of `src/launcher/launcher.ts`, `just test src/launcher -t stdin` | held: the request held `"hi\nLEAKED-STDIN-LINE\n"`; restored to `ignore` |
| F17 | a fresh `CLAUDE_CONFIG_DIR` cannot see the claude.ai login | `"loggedIn": false` | `env -i HOME PATH TMPDIR USER CLAUDE_CONFIG_DIR=$TMPDIR/probe-auth/cfg2 claude auth status` | held: `"loggedIn": false, "authMethod": "none"`; the login (Max, `configDirectory` `~/.claude`) is bound to the default config folder. A paid run uses the real config folder |
| F18 | `env -i` with `HOME` and `PATH` keeps the login | `"loggedIn": true` | `env -i HOME PATH TMPDIR claude auth status`, then the same plus `USER` | refuted: `false` without `USER`, `true` (`claude.ai`) with it. A paid run passes `USER` |
| F19 | `ANTHROPIC_BASE_URL` turns the login off | `"loggedIn": false` | `env ANTHROPIC_BASE_URL=http://127.0.0.1:9 claude auth status` | refuted: `true` |
| F20 | the login passes through a forwarding fake | `/v1/messages` forwarded with `authorization`, status 200 | `bun /tmp/probe-fwd/run.ts <kit> <out>` (Haiku, `--tools ""`, `--setting-sources ""`) | held with `USER` set: `HEAD /api/hello` 200, `POST /v1/messages?beta=true` 200 with an `authorization` header; 3,172 tokens, ledger $0.0006354 = CLI `total_cost_usd`. Without `USER`: "Not logged in · Please run /login", no `/v1/messages` request |
| F21 | a tool that a Mod registers with `$.tool.register` in `session.start` is in the first request's `tools` | `tools[].name` holds `mcp__toolp__echo` | `just test src/template` (rendered `mcp-tool` plugin, kit fake) | refuted: `tools` held only `ToolSearch`; the name rode in a `role: "system"` message under "The following deferred tools are now available via ToolSearch…", one per line, ended by a blank line. The fake's `tool_use` of it still reached the `tool.call` hook, and request 2 held its answer. `assertArm` now reads that list (`deferredTools`); `src/arm/arm.test.ts` "assertArm on deferred tools" failed before the change |
| F22 | a classic `UserPromptSubmit` command hook's `hookSpecificOutput.additionalContext` reaches the first request | the marker is in request 1 | same run | held; a mutant that printed another string failed the test |
| F23 | a Mod `prompt.context` hook that appends `{ name, text }` to `blocks` reaches the first request, and the debug log lists `modp@inline` with `prompt.context` | marker in request 1, `hookEvents` match | same run | held |
| F24 | a plugin output style is named `<plugin>:<name>` in `outputStyle` and in `# Output Style:` | `stylep:Terse` | same run | held |
| F25 | under the login, `--tools ""` sends no tool in request 1 | `tools` is `[]` in every arm | opener `--run`, 3 sessions on Opus 5.5 | refuted: 1 of 3 (`fix`, `20261105-201420-252ba8`) sent 32 tools, 31 `mcp__claude_ai_*` connectors and `DeferredToolPlaceholder`, and wrote 20,499 cache tokens against about 3,270 for the others. The connectors load async, so the leak is per run. The launcher now sets `ENABLE_CLAUDEAI_MCP_SERVERS=false` under the login unless the arm sets it (`src/launcher/launcher.test.ts` "the login turns the account's claude.ai connectors off…"). The second `--run`, with the switch (`envNames` holds it in all 3 `run.json`), sent `[]` in 3 of 3. Thin sample: 3 runs |
| F26 | a transcript written to `<CLAUDE_CONFIG_DIR>/projects/<cwd with each non-alphanumeric as ->/<uuid>.jsonl` and opened with `-p --resume <uuid> --no-session-persistence` sends its messages before the new prompt, with tools on | request 1's `messages` hold the prefix ask, the prefix reply, then the prompt | `bun /tmp/probe-resume/probe.ts /tmp/probe-resume/run` (2026-11-05, $0, fake key) | held: 5 messages in the order user `PREFIX-ASK`, system, assistant `PREFIX-REPLY`, user `NEW-PROMPT`, system; 12 tools. Plan, not run: a login run reads the real `~/.claude`, so its replay transcript goes under that folder's `projects/` for the run's own `$TMPDIR` cwd and is deleted after the run; the miner reads only the two claudetto project folders |
| F27 | a rule denial fires `PostToolUseFailure` or `PermissionDenied`, so a hook can label it in the same turn | one of the two fires for the denied `Read` and `Bash cat` | `bun probes/denial-hooks/probe.ts` (2026-11-05, $0, fake API, Claude Code 2.1.318; deny `Read(//<resolved tmp>/secret/**)` in `--settings`) | failed: the events were `UserPromptSubmit PreToolUse PostToolBatch Stop`. The denied `Read` fired no hook, `Bash cat` fired only `PreToolUse`, and neither failure event fired. The docs limit `PermissionDenied` to auto-mode denials (https://code.claude.com/docs/en/hooks, events table). The model read `<tool_use_error>File is in a directory that is denied by your permission settings.</tool_use_error>` and `Permission to use Bash with command cat … has been denied.`, which name no rule. Two earlier runs denied for other reasons: a rule written `/abs/path` is relative to the settings file and needs `//`, and macOS resolves `/var` to `/private/var` |
| F28 | at `PostToolBatch` the transcript already holds each denied call's `permissionDecision` | the hook finds both entries with their fields | same probe with `persist: true` (`LaunchSpec.persist`, which drops `--no-session-persistence`) | held: `Read` `{decision: reject, reasonType: rule, ruleSource: flagSettings, reasonCode: rule:flagSettings}`; `Bash` `toolDenialKind: permission-rule`, `reasonType: subcommandResults`, `ruleSource: flagSettings`. `PostToolBatch` input itself carries only `tool_response` text. A cancelled call carries `toolDenialKind: cancelled` and `permissionDecision {decision: cancelled, source: user_abort}`, plus `interruptedBySendNow: true` when the user's mid-turn message cancelled it (session `e86b0896`, line 1552). The cancel carries the reject text `gR` ("The user doesn't want to take this action right now…"), which `A5e` returns for every abort reason except `permission-stop` and the flagged `interrupt` |
Bun facts:

| # | hypothesis | command | result |
| --- | --- | --- | --- |
| B1 | `bun test` writes a missing `toMatchSnapshot` snapshot without `-u` outside CI | `bun test s.test.ts` in `$TMPDIR/probe-snap` | held: "snapshots: +1 added"; under `CI=true` a missing snapshot fails. So the kit keeps its own `.snap` writer, which writes only under an explicit `--update`. |
| B2 | `bun check` type-checks from the nearest `tsconfig.json` | `bun check --help` | held: "Uses the nearest tsconfig.json and reports the same errors as tsc" |
| B3 | the repo's Biome runs without Node | `node_modules/.bin/biome --version` | refuted: "env: node: No such file or directory"; `bun --bun node_modules/.bin/biome --version` prints 2.6.3 |
| B4 | `bun check` is always the type checker | `bun check` with a `package.json` script named `check` | refuted: Bun ran the script (`just check`), not the checker. `claudekit/package.json` has no `scripts`; `just` is the one task runner |
| B5 | Biome's strict preset reads the nearest `.gitignore` | `just lint` in `claudekit/` | held: "Biome couldn't find an ignore file" (`biome-json/strict` sets `vcs.useIgnoreFile`). The kit sets it off (in `claudekit/biome.jsonc`, while that file existed). With no config in `claudekit/`, Biome walks up to `~/biome.json`, which names a missing `./t.grit`, and fails (O1). Lint was then dropped (O1), so no kit config sets `vcs.useIgnoreFile` |

External sources, read 2026-11-05:

- Prices: <https://platform.claude.com/docs/en/about-claude/pricing>. Opus 5.5 $4 in, $5 5m write, $8 1h write, $0.20 hit, $20 out; Sonnet 5.5 $2, $2.50, $4, $0.10, $10; Haiku 5.5 up to 100,000 prompt tokens $0.10, $0.125, $0.20, $0.01, $0.50, over 100,000 $0.50, $0.625, $1, $0.05, $2.50 (per MTok). **Hypothesis**: the Haiku tier counts input plus cache write plus cache read of one request; the ledger uses that and says so.
- Stream-json and transcript schemas: `clawdipedia schema claude-code-stream-json` (`assistantOutput`, `result_successOutput`) and `claude-code-transcript`, both "Claude Code 2.1.316" (<https://clawdipedia.cc/schemas/claude-code-stream-json.json>). The assistant frame's `message.content` "typically holds the single block this message delivers"; frames from one API answer share `message.id`; `parent_tool_use_id` marks a subagent frame.
- Flags: `claude --help` of 2.1.318, read this session: `--debug-file`, `--no-session-persistence` ("only works with --print"), `--setting-sources`, `--settings <file-or-json>`, `--plugin-dir` (repeatable), `--output-format text|json|stream-json`, `--verbose`, `--tools`, `--model`, `--permission-mode`, `--max-budget-usd`.
- Bun test: `bun test --help` of 1.4.4: `-u, --update-snapshots`, `--timeout` (default 5000), `--max-concurrency`.

## Practice the code follows

- One job per module, ≤ 30 lines per function as the target, nesting ≤ 2 (`external/please-use-me-often/code-readability-for-humans-and-ai-agents.md:27-41`).
- File order: imports, constants, public types, public API, private code (`code-readability-for-humans-and-ai-agents.md:388-409`).
- Tests as the executable spec, a known-bad input for each check (`swe-best-practices.md:56`); held-out cases the graded agent cannot read (`swe-best-practices.md:97`).
- Tool errors say what failed and what to do (`swe-best-practices.md:127`).
- Prompts and fixtures that the kit ships put untrusted text in tags with random ids and use contrastive examples with a rationale (`external/please-use-me-often/xml-prompting-guide.md:225-253`). Used by the model judge's prompt.

## Toolchain

| piece | choice | why |
| --- | --- | --- |
| runtime, test runner | Bun 1.4.4 (`.bun-version`) | the repo pins it; `bun test` runs TypeScript with no build |
| types | `bun check` with `claudekit/tsconfig.json`, `strict`, `bun-types`; `probes/*/plugin/**` excluded | B2; no `tsc` or Node install needed (B3 shows Node is absent). A probe's Mod hook imports `claude-code`, which only the engine's own declarations resolve, so `just hooks` checks `probes/*/plugin` against them without `bun-types` (O2) |
| lint and format | none | the user removed lint from the kit on 2026-11-05 ("user deleted the lint"), overriding `GOAL-1.txt` item 13; B3 and B5 record what was tried before |
| task runner | `just` (`/opt/homebrew/bin/just`) | the repo used a `justfile` until `f4fdf73a`; headless recipes (`swe-best-practices.md:86`) |

The kit keeps its own `package.json`, `tsconfig.json`, and `justfile` inside `claudekit/`, so nothing at the repo root or under `plugins/` changes. `just test` runs the kit's tests, `just hooks` type-checks each probe's plugin hooks, and `just check` runs tests, types, and hooks. `claudekit/types/` holds the generated engine declarations and is ignored by git (`claudekit/.gitignore`).

## File layout

```text
claudekit/
  DESIGN.md  package.json  tsconfig.json  justfile
  bin/claudekit.ts            one CLI, subcommands, --help
  src/shared/                 model ids and the default model, temp folders, record guard, block text; one copy each
  src/workspace/              run folders, run.json, clean
  src/launcher/               argv and env, option checks, print and tmux modes, stop by pid
  src/fake/                   fake Messages API (own process), reply plan, SSE, usage
  src/arm/                    arm config, plugin copy and patches, tree hash, assertion
  src/capture/                split, normalize, .snap, diff
  src/reply/                  stream-json, json, transcript readers; sentences
  src/grade/                  grader type, structural, text, human-labeled, model judge
  src/ab/                     plan, runner, Wilson interval, symmetric rule, report
  src/ledger/                 price table, cost, ledger file, cap
  src/timing/                 debug-log timeline
  src/template/               .tpl render and the templates
  src/fixture/                fixture format, held-out grading
  probes/                     the acceptance ports, each built on the modules
```

Each module folder holds its code and one `*.test.ts`.

## Modules

Every module's public API is importable, and the CLI (`bin/claudekit.ts`) exposes it as a subcommand with `--help`.

### 1. workspace

Need: fixed `/tmp` paths fail under the sandbox (`ISSUES-2026-11-04-0934.md:254-258`); deleted traces stop a re-grade (`07-measurement-and-environment.md:42`).

```ts
createRun(opts: { probe: string; root?: string }): Promise<Run>   // root defaults to $TMPDIR/claudekit
type Run = { id: string; dir: string; probe: string }
writeRecord(run, record: RunRecord): Promise<void>
readRecord(dir): Promise<RunRecord>
listRuns(opts: { probe?: string; root?: string }): Promise<RunSummary[]>
planClean(opts: { probe: string; olderThanDays: number; root?: string }): Promise<string[]>
clean(paths: string[]): Promise<void>                              // deletes only the named paths
```

`RunRecord`: `argv`, `envNames` (names, never values), `claudeVersion`, `pluginTreeHashes`, `model`, `settings`, `startedAt`, `endedAt`, `pid`, `exitCode`, plus `arm` and `case` names. The id is `YYYYMMDD-HHMMSS-<6 hex>`, and `createRun` prints it. A run is never deleted by a run; `claudekit clean` prints each path first and deletes only with `--yes`.

### 2. launcher

Need: the `env -i` wrapper had 33 copies (`/tmp/probe-fake/bin/run.sh`); stdin leaks into the prompt (F7); the string option cost 52,559 tokens (`ISSUES.md:451`); a same-process fake hung 6 sessions (`ISSUES.md:522`); `pkill -f` stops by pattern.

```ts
type LaunchSpec = { prompt: string; mode: "json" | "stream-json" | "tui"; model: string; pluginDirs: string[];
  settings: Settings; settingSources: ("user"|"project"|"local")[]; env: Record<string,string>;
  passEnv: string[]; flags: string[]; cwd: string; baseUrl?: string; timeoutMs: number }
buildLaunch(spec, run): { argv: string[]; env: Record<string,string> }     // pure
checkOptions(spec): Promise<OptionError[]>        // settings.pluginConfigs[*].options against each plugin's userConfig types
launch(spec, run): Promise<LaunchResult>           // async Bun.spawn, stdin /dev/null; writes run.json
launchTui(spec, run, steps): Promise<LaunchResult> // tmux session named after the run id
stop(run): Promise<boolean>                        // kills only the pid in run.json
```

The env is `env -i` plus `HOME`, `PATH`, `TMPDIR`, `TERM=dumb`, `CLAUDE_CONFIG_DIR=<run>/config`, `DISABLE_TELEMETRY=1`, `DISABLE_AUTOUPDATER=1`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`, the fake's `ANTHROPIC_BASE_URL` and a dummy key, and the names in `passEnv`, which copy the parent's value without printing it (a token passes by reference). `json` mode adds `--verbose`, so the output holds every frame (F4). The launcher has no synchronous API; the fake runs only as a child process (module 4), and the test answers the fake from a blocked `spawnSync` caller.

### 3. arm

Need: wrong-arm runs (`07-measurement-and-environment.md:33-35`); fork patches made by hand under `/tmp/probe-opener/{cur,fix,fix2}`.

```ts
type Arm = { name: string; plugins: { dir: string; patches?: Patch[] }[]; settings: Settings; env: Record<string,string>;
  flags: string[]; model: string; expect: ArmExpect }
type ArmExpect = { plugins?: string[]; outputStyle?: string; agents?: Record<string, number>; skills?: Record<string, number>;
  commands?: Record<string, number>; hookEvents?: Record<string, string[]>; toolsInclude?: string[]; toolsExclude?: string[]; model?: string }
materializeArm(arm, run): Promise<{ pluginDirs: string[]; treeHashes: Record<string,string> }> // copies, applies patches, fails on a patch that matches nothing
assertArm(expect, { debugLog: string; firstRequest: unknown }): ArmCheck   // { ok, observed, diff[] }
treeHash(dir): Promise<string>
```

Signals: F10 (output style, read from `body.system` and the `role: "system"` messages), F11 (plugins, hooks, counts), and the first request's `model`, `tools[].name`, and deferred tool list (F21). `toolsInclude` passes on a tool sent or deferred; `toolsExclude` fails on either and says which. `src/arm/arm.test.ts` asserts a real `claude -p` launch against the fake: the matching expectation passes, and four wrong fields give four diff lines.

### 4. fake

Need: 15 copies; the shared id (`ISSUES.md:526`, F6); same-process hang (`ISSUES.md:522`); the global run file (`/tmp/probe-fake/bin/run.sh:9`).

```ts
type Plan = { steps: Step[]; fallback?: Reply }
type Step = { match?: { hasTools?: boolean; lastUserIncludes?: string }; reply: Reply }
type Reply = { blocks?: Block[]; stop?: StopReason; delayMs?: number; error?: { status: number; type: string; message: string };
  id?: string; outputTokens?: number }
startFake(opts: { plan: Plan; dir: string; forward?: string }): Promise<Fake>   // spawns `bun src/fake/server.ts`
type Fake = { url: string; pid: number; stop(): Promise<void> }
readRequests(dir): Promise<SavedRequest[]>   // NNNN.json body + NNNN.headers.json, in order
```

Each answer gets `msg_<run token>_<n>` unless the step names an id (the test of F6 needs one). `usage` reports input tokens as body characters / 3.6 (**hypothesis** for the ratio; the ledger never prices a fake run), a cache read equal to the prefix shared with the request before it up to its last `cache_control`, and the rest as a cache write. `POST /v1/messages/count_tokens` answers `{ input_tokens }`. Forward mode sends each body to the named URL with its own headers and saves the request first; the CLI's key passes through, never read by the fake. Headers are saved with `x-api-key` and `authorization` redacted.

CLI: `claudekit fake serve PLAN.json DIR` prints `url`, `pid` (the command's own), and `server pid`. SIGINT or SIGTERM to `pid` stops both processes. It printed only the server's pid before 2026-11-05, and stopping that pid left the command waiting forever (observed: pid 81447 stayed alive after its server 81449 was killed). Test: `src/cli/commands.test.ts` "prints its own pid…", which failed before the fix.

### 5. capture

Need: seven differs (`msgdiff.ts`, `sysdiff.ts`, …), each with its own scrub; the snapshot behavior of B1.

```ts
splitRequest(body): Part[]               // { key, kind, text, bytes, tokens }
normalize(text, ctx): string             // ids, uuids, timestamps, dates, temp paths, cc_version, <total_tokens>
toSnap(parts): string;  parseSnap(text): Part[]
diffParts(old, new): PartDiff[]          // { key, change: "added"|"removed"|"changed", bytesDelta, tokensDelta }
checkSnap(file, parts, { update }): Promise<SnapResult>   // writes only when update is true
```

Parts, in cache order: `head` (model, thinking, output_config, context_management), `tool:<name>`, `system[i]`, and per message `msg[i]:<role>:<kind>[j]`, kind one of `text`, `reminder` (text that starts with `<system-reminder>`), `tool_use` (name and input, no id), `tool_result` (text blocks as text, other blocks as JSON), `other`. A `role: "system"` message (F9) shows as `msg[i]:system:…`. Bytes are UTF-8; tokens are the fake's estimate (**hypothesis** ratio), not an API count.

Also shipped, because the `/tmp` differs served these needs: `newText` (msgdiff), `lineDiff` (textdiff), `cachePrefix` (prefix), `toolSizes` (cmp), `loadRequests` and `pickRequest` (a folder of `NNNN.json` or a JSONL file; `first`, `last`, `largest`, or an index). CLI: `bin/claudekit.ts capture split|diff|prefix|tools|snap`, `--help`.

**Status: complete**, verified 2026-11-05 by running each old script and the new command on the same saved inputs (`$TMPDIR/capture-verify/{old,new}/`):

| old script | input | old finding | new command | new finding |
| --- | --- | --- | --- | --- |
| `/tmp/probe-handover/sysdiff.ts` | `mod.jsonl` rows 0, 2 | block 0 differs at 47, `cc_version` `606` → `48b`, cache unchanged | `capture diff mod.jsonl@0 mod.jsonl@2` | `system[0]` changed at 47, same text; also lists the message changes the old one skipped |
| `/tmp/probe-idle/sysdiff.ts` | `bodies-trigger.jsonl` first, last | block 0 differs at 47, `606` → `82d` | `capture diff …@0 …@last` | same |
| `/tmp/probe-real/prefix.ts` | `fbodies.jsonl` | 4 rows: breakpoints, first diff -1,-1,-1,12, best entry -,req0@24,req1@26,- | `capture prefix` | same on every field; share 98.2% against 98.3% (characters counted over a different encoding) |
| `/tmp/probe-shared/prefix.ts` | `bodies.jsonl` 0, 1, first 2 messages | tools, system, messages identical (cache stripped) | `capture diff …@0 …@1` | tools, system identical; `msg[1]` text identical, only its cache mark moved; later messages added |
| `/tmp/probe-b4/cmp.ts`, `/tmp/probe-ov11c/cmp.ts` | mon27, mon29 | `Monitor` gone, `mcp__claudetto__monitor` new, 12 tools unchanged | `capture tools …@last …@last` | same; sizes are UTF-8 bytes (`Agent` 5246 chars = 5272 bytes, em dashes). The old b4 total left out B-only tools |
| `/tmp/probe-fake/bin/msgdiff.ts` | mon27, mon29 largest | 9 new blocks | `capture diff --new` | 8; the ninth was the `ToolSearch` call, identical in mon27 but for its run id |
| `/tmp/probe-fake/bin/textdiff.ts` | mon27, mon29 largest | 3 groups; tool lines; message lines | `capture diff --lines` | same groups and tool lines; message lines differ only by the old per-run `toolu_fake_*` ids |

The comparison found two defects, each fixed with a failing test first: a `tool_result` holding only a `tool_reference` read as empty, and a change in `cache_control` alone printed a text position.

### 6. reply

Need: `.result` holds only the tail (F2, `settings-review.txt:3410-3412`).

```ts
readStreamJson(text): Reply;  readJsonOutput(text): Reply;  readTranscript(text): Reply
type Reply = { complete: boolean; reason?: string; segments: Segment[]; toolCalls: ToolCall[]; turns: number }
type Segment = { turn: number; messageId: string; text: string }
replyText(reply): string;  sentences(text): string[];  firstSentence(reply): string
```

`readJsonOutput` reads the `--verbose` array. A single result object (the opener's saved files) yields `complete: false`, `reason: "json output without --verbose holds only .result"`, and no segment, because `.result` is the last segment only (F2). A grader refuses an incomplete reply. Sentences split on `.`, `!`, `?` before a space or a line end, keep code spans and abbreviations such as `e.g.` whole, and drop a leading Markdown heading or list mark.

### 7. grade

Need: the wrong instrument and an untested grader (`07-measurement-and-environment.md:36-39`, `:69`); the regex that missed "Correction: I was wrong, and you are right."

```ts
type Grader<I> = { name: string; grade(input: I): Verdict; fixtures: { good: I[]; bad: I[] } }
type Verdict = { pass: boolean; label: string; evidence: string }
checkGrader(g): FixtureReport               // every good passes, every bad fails; else the grader is unusable
structural(spec): Grader<unknown>          // field paths, counts, byte ranges
textGrader({ name, classes, examples }): Grader<string>  // classes of patterns; examples are labeled sentences
humanLabeled(file): Grader<string>         // labels from a fixture file, by case id
judge({ prompt, fixtures, call }): Grader  // model judge; agreement(judge, human) reports agreement and kappa
```

A text grader loads only when every labeled example gets its label; otherwise it throws with the examples it missed, so a lone regex cannot ship.

### 8. ab

Need: lopsided rule (`07-measurement-and-environment.md:40`), a case that cannot separate (`:41`), thin samples (`:43`), the 895k overrun (`ISSUES.md:458-466`).

```ts
type Experiment = { name: string; arms: Arm[]; cases: Case[]; n: number; parallel: number; tokenBoundPerRun: number }
planExperiment(e): Plan                     // sessions and the token bound; no call
runExperiment(e, { run: boolean }): Promise<Report>   // refuses without run: true; asks the ledger first
wilson(k, n, z?): [number, number]
decide(base, arm, { margin }): "better" | "worse" | "no difference"  // one rule for both directions
separates(base, arm): boolean               // false prints "case does not separate the arms"
```

Each `SessionResult` carries a required `armCheck` (from `assertArm`), so a session that skipped the assertion does not type-check. `summarize` counts only sessions whose check passed; the report lists each failed one under `rejected` with its diff, and the ledger still bills it. Test: `src/ab/ab.test.ts` "a session whose arm check failed…"; counting from all results instead made it fail (mutation, 2026-11-05).

`src/ab/session.ts` holds what every port's session repeated (jscpd 5.4.2, 2026-11-05: a 23-line launch block in all three probes, 9 clones before, 5 after): `launchArm(arm, case, { probe, plan, forward?, launch })` makes the run folder, copies the arm, starts its own fake, launches, and stops the fake in a `finally`; `measuresByArm` groups measures from sessions whose arm check passed. Test: `src/ab/session.test.ts`. A mutant without `fake.stop()` failed its `ps` check and left the fake alive (pid 91802, stopped by pid).

`decide` calls a difference only when the whole interval of the difference sits past `margin` on one side, and the same rule mirrors for the other side; its test feeds both directions.

### 9. ledger

Need: `ISSUES.md:530` (a cache write left out), `ISSUES.md:458-466` (the bound).

```ts
PRICES: Record<Model, Price>                // Model and MODELS come from src/shared/model.ts
cost(model, usage): number                  // throws on any other model
appendEntry(file, entry): Promise<Ledger>;  readLedger(file): Promise<Ledger>
admit(ledger, { bound, cap }): { ok: boolean; reason: string }   // refuses when total + bound > cap or bound > per-run cap
```

Usage: `input_tokens`, `cache_creation.ephemeral_5m_input_tokens`, `ephemeral_1h_input_tokens` (or `cache_creation_input_tokens` as 5m when the split is absent), `cache_read_input_tokens`, `output_tokens`. Default ledger: `claudekit/ledger.jsonl` in the repo, so it outlives `$TMPDIR`. Caps: 300,000 tokens per run, 2,000,000 for the goal (`openspec/changes/release-0-4-0/goal.md`).

### 10. timing

Need: the race measured by hand from debug lines (`settings-review.txt:3337-3377`).

```ts
timeline(debugLog): Mark[]                  // { at: ms since first line, kind, text }
firstRequestAt(marks); settled(marks, module, event): Mark[]
settledBeforeFirstRequest(marks, module, event): boolean | undefined
```

Marks have kind `request`, `settled` (with `module`, `event`, `ms`), or `line`. `undefined` means a mark is missing, so it is not read as a race lost or won. Observed: all 448 `[API REQUEST]` lines in `/tmp/probe-*/**/*.debug` read `/v1/messages` (`grep -ho '\[API REQUEST\] [^ ]*' … | sort | uniq -c`). The test lines come from `/tmp/probe-fsx/fr-date9-1.debug:107,138,161`. Flipping the comparison made the test fail (mutation, 2026-11-05).

### 11. template

```ts
render(template: string, vars: Record<string,string>): string   // throws on an unset {{name}}, lists them all
renderKind(kind, vars, outDir): Promise<string[]>   // classic-hook, mod-hook, output-style, agent, skill, command, mcp-tool, settings, probe
variables(kind): Promise<string[]>                  // names used in the kind's file paths and bodies
engineTypes(out = "types/claude-code.d.ts"): Promise<{ path; version; written }>   // the engine's declarations, regenerated at $0 when the version changes
checkHooks(dirs: string[], types?): Promise<{ ok; output }>   // `bun check` of each folder's .ts files against those declarations; throws on a folder with none
```

Templates live in `src/template/kinds/<kind>/`, one `.tpl` per output file, with `{{name}}` allowed in paths. Every plugin kind also renders `kinds/plugin/.claude-plugin/plugin.json`. `{{name}}` inserts the value as is; `{{json name}}` inserts a JSON string, which is also a valid YAML and TypeScript string, so a description with quotes or a colon cannot break the manifest or the front matter. `renderKind` writes nothing when a variable is unset or any target file exists, so it never overwrites a run's or a user's file. CLI: `claudekit template list|vars KIND|render KIND OUTDIR --var NAME=VALUE|types|check DIR...`.

Shapes, from the installed claudetto plugin (`~/.claude/plugins/marketplaces/claudetto/plugins/claudetto/`: `hooks/hooks.json`, `src/blocks/handoff/block.ts:196-215`, the Markdown front matter of `agents/`, `skills/`, `commands/`, `output-styles/`) and clawdipedia (`extend/mod-api` "A First Mod", `extend/mod-api/calls/tool-command-config`, `schema claude-code-plugin-hooks`, read 2026-11-05).

**Status: complete**, verified 2026-11-05 (`just test src/template`, 12 tests; the 2 hook-type tests are O2's): each plugin kind, rendered and loaded together in one real `claude -p` against the kit fake, passes `assertArm` (F21-F24); the classic and Mod hook contexts reach request 1; the registered tool answers the fake's call. The probe skeleton, rendered beside a link to `src/`, passes `bun check` and runs 2 arms × 3 at $0 with `rejected: []`. Mutations: the classic hook's context, the tool's answer, and a wrong import in the probe each failed their test.

### 12. fixture

```ts
type Fixture = { id: string; prefix: Message[]; reply: string; userReply: string; labels: Record<string,string>;
  source: string; heldOut?: boolean }
loadFixtures(path): Promise<Fixture[]>      // validates each field
gradeHeldOut(setPath, graderModule): Promise<Aggregate>   // runs in a child process; returns counts only
```

`gradeHeldOut` starts `bun src/fixture/held-out-worker.ts` with the set's path and a grader module (default export `Grader<Fixture>`). The child's stdout and stderr are ignored, and it sends only `{ n, pass, byLabel }` over Bun's IPC, so the caller never holds a case's text, even from a grader that prints it. A failure sends "grader failed on case K of N" and never the thrown text. Held-out is a mark on the set (`{ name, heldOut, fixtures }`), not on a fixture. CLI: `claudekit fixture check SET`, `claudekit fixture grade SET GRADER`.

**Status: complete**, verified 2026-11-05 (`just test src/fixture`, 6 tests). Hypothesis: Bun IPC delivers the child's message while its stdout is ignored. Run `$TMPDIR/probe-ipc-*/parent.ts` printed `[{"n":1}]`, and the child's printed line was absent. A test runs `gradeHeldOut` in a separate process and checks its whole output for the case marker. A mutant that inherited the worker's stdout failed that test.

## Acceptance ports

| port | old run | new run |
| --- | --- | --- |
| `settings.read` race | `settings-review.txt:3355-3370`, `/tmp/probe-fsx/*.debug` and `/tmp/probe-fake/req/fr-*` | `probes/settings-race`: 11 arms × 5, fake API, $0 (the record's 5-run arms; fx1-3 were single exploratory runs) |
| Monitor | mon29 against mon27, `settings-review.txt:3286-3292`, `/tmp/probe-fake/req/mon27`, `mon29` | `probes/monitor-search`: two arms × 5, fake API, $0 |
| opener A/B | `settings-review.txt:3397-3414`, `/tmp/probe-opener/out` | `probes/opener`: re-grade the saved outputs with `reply`, plus one paid run per arm |

Results go in the section "Port results" below as they come.

## Decisions log

- D1. Own `.snap` format, not `toMatchSnapshot`: B1 shows Bun writes a missing snapshot without a flag.
- D2. `json` mode always adds `--verbose`: F2 and F4.
- D3. Kit config inside `claudekit/`: the goal keeps `plugins/` out of scope, and no root file needs to change.
- D4. Ledger in the repo, run folders in `$TMPDIR`: the total must outlive a reboot; traces are large.
- D5. Real `HOME` by default, with `CLAUDE_CONFIG_DIR` and `--setting-sources` isolating the config: the recorded ports ran that way (`/tmp/probe-fake/bin/run.sh:15`); the arm assertion catches a leaked plugin.
- D6. `grade` is temporary: the user said on 2026-11-05 that `claude plugin` evals in the claudetto plugin replace it. It keeps only what the three ports need and gains no new kinds.
- D7. The ledger holds the opener record's 64 paid runs as well as the kit's, each marked `record:` with its CLI price in the note: `done_when` asks for every paid run, and counting them against the goal cap only makes `admit` stricter.

## Port results

### settings.read race (2026-11-05, $0, fake API, claude-haiku-5-5, Claude Code 2.1.318)

`probes/settings-race/`: `plugin/` (rendered with `claudekit template render mod-hook`, then given the recorded workloads), `race.ts` (measure and the `keptOut` grader), `probe.ts`, `race.test.ts` (3 tests). The launch matches `ovrun.sh`: `--setting-sources project`, `--settings '{"permissions":{"allow":["Bash"]}}'`, prompt `hi`, text mode, one session at a time. Mutations: a hook that returns its answer unchanged failed the session test ("listed"); a grader with `pass` flipped failed the fixture test.

Re-grade of the 55 recorded runs (`bun probes/settings-race/probe.ts --regrade`), with the new timing reader and grader: every row equals `settings-review.txt:3359-3369`, including seq's run with no settle line.

Fresh runs (`--run`, 55 sessions, 20.6 s, `rejected: []`):

| arm | old settled ms | new settled ms | old listed | new listed |
| --- | --- | --- | --- | --- |
| seq | 82.9-90.6, 1 none | 20.1-22.7 | 5 of 5 | 0 of 5 |
| par | 36.7-68.4 | 13.0-18.1 | 3 of 5 | 0 of 5 |
| none | 20.3-28.8 | 10.7-11.8 | 0 of 5 | 0 of 5 |
| one | 13.5-14.5 | 11.8-12.8 | 0 of 5 | 0 of 5 |
| store | 34.5-35.8 | 16.2-17.5 | 0 of 5 | 0 of 5 |
| exists1 | 13.4-31.8 | 11.2-12.3 | 0 of 5 | 0 of 5 |
| write1 | 13.3-17.5 | 11.6-12.2 | 0 of 5 | 0 of 5 |
| list4 | 13.7-16.9 | 11.5-13.3 | 0 of 5 | 0 of 5 |
| par8 | 13.0-15.5 | 12.0-16.7 | 0 of 5 | 0 of 5 |
| seq8 | 36.3-38.7 | 19.7-21.0 | 0 of 5 | 0 of 5 |
| date9 | 13.7-28.9 | 11.3-12.7 | 0 of 5 | 0 of 5 |

A second fresh `--run` in a later session gave the same table within about 1 ms per cell (seq 20.4-21.9, par 13.0-18.8, none 10.6-11.4, seq8 19.1-21.2), 0 of 55 listed, `rejected: []`, and every arm "case does not separate the arms" against seq.

Reproduced: the record's rule, "every hook that settled in 38.7 ms or less kept simplify out" (47 of 47 then; 55 of 55 now, all at 22.7 ms or less). Not reproduced: the slow arms. seq and par settle about 4× faster now, the rest about 2×, so no fresh arm reaches the 66-90 ms where the record saw simplify listed.

New observation from the re-grade: in par, all 5 recorded settles were logged before `[API REQUEST]`, and 3 still listed simplify. The logged order of settle and request does not decide the race; the listing is built earlier.

Search for the cause, each a `--variant` of `probe.ts` that changes one thing from the fresh setup to the recorded one:

- H3, the old seq and par overlapped. Refuted: their start and end lines are strictly sequential (`fr-seq-1` 16:20:00.254-.533, `fr-par-1` .677-.981, …).
- H4, the old seq, par, and none loaded a hook with no `session.start` (`fr-seq-1.debug:89`; `one` and later had both). `--variant nostart`, 15 runs, each loaded only `settings.read`: seq 20.8-21.9, par 19.3-20.8, none 17.3-44.8. Refuted for seq and par.
- H1, the old writes went to `/tmp`, outside the work folder. `--variant abs`, 10 runs, files written to `/tmp/probe-race-abs/`: seq 20.4-21.6, par 12.4-18.7. Refuted.
- H5, the old runs shared one config folder (`ovrun.sh`: `CLAUDE_CONFIG_DIR=/tmp/probe-fake/cfg`, 29 MB). `--variant oldcfg` on a copy, 15 runs: seq 33.8-34.7, par 25.3-25.9, none 10.6-11.7. Holds in part: about +13 ms for seq and +10 ms for par, none unchanged; 0 of 15 listed.
- The hook's own per-call times: the last recorded seq run logged `[2,15,16,16,16,16,47,51]` ms after each `exists` (`/tmp/probe-fsx/log-seq-done`), and the fresh run logged `[1,1,2,2,2,3,3,3]`. The recorded par finished its calls in 3 ms and still settled at 36-68 ms. So the old calls waited on something else that was busy. The hook's code was not the cost.
- Hypothesis, not tested: load on the machine at 16:20 slowed every recorded arm about 2× (even none, which makes no `$.fs` call). A past load cannot be replayed.

### Monitor search (2026-11-05, $0, fake API, claude-haiku-5-5, Claude Code 2.1.318)

`probes/monitor-search/`: `plugin/` (rendered with `claudekit template render mcp-tool`, then given the recorded wrapper spec, the deferred stock Monitor, and the `ToolSearch` rewrite of `/tmp/probe-mon8/claudetto/hooks/register.js:4-17,45-53`), `search.ts` (measure and the `wrapperOnly` grader), `probe.ts`, `search.test.ts` (3 tests). The plugin is named `claudetto` so the wrapper's name, and its bytes, equal the record's. The arms differ in one env value: `MONITOR_SEARCH=stock` (mon27, no rewrite) and `rewrite` (mon29). The fake's plan replaces the record's `TOOL ToolSearch {"query":"monitor","max_results":5}` prompt line with a scripted `tool_use`. The measure takes the tools that request 2 sends and request 1 did not.

Hypothesis: `toolSizes` reproduces the record's 7,586 for stock Monitor. Refuted: it gave 7,624. The record counted characters (`jq 'tojson|length'`), and the kit counts UTF-8 bytes. A check of `/tmp/probe-fake/req/mon27/2897.json` found 7,586 characters, 7,624 bytes, and 19 non-ASCII characters (`—`, `→`, `…`) at 3 bytes each. The wrapper is ASCII, so both counts are 866.

| arm | old loaded | new loaded, re-grade (`--regrade`) | new loaded, fresh (`--run`, 5 per arm) | wrapper only |
| --- | --- | --- | --- | --- |
| stock (mon27) | `Monitor`, 7,586 chars | `Monitor`, 7,624 bytes | `Monitor`, 7,624 bytes, 5 of 5 | 0 of 5 |
| rewrite (mon29) | `mcp__claudetto__monitor`, 866 | `mcp__claudetto__monitor`, 866 bytes | `mcp__claudetto__monitor`, 866 bytes, 5 of 5 | 5 of 5 |

Report: rewrite against stock "better", separates, Wilson intervals [0, 0.43] and [0.57, 1], `rejected: []`. Mutations: a rewrite that ignores `MONITOR_SEARCH` failed the session test (stock loaded the wrapper), and a `tool.describe` that sets `isDeferred: false` failed it (stock's search added no tool, since Monitor was sent up front).

### opener A/B (2026-11-05, claude-opus-5-5, Claude Code 2.1.318)

`probes/opener/`: `opener.ts` (text grader, 10 labeled first sentences from the record's own runs), `probe.ts` (`--regrade`, `--run`, `--replay`), `opener.test.ts` (5 tests). The model is Opus 5.5 because the record ran on it (`settings-review.txt:3397`). Arms: the record's plugin copies `/tmp/probe-opener/{cur,fix,fix2}`, output style `claudetto:Concise`, `--tools ""`, output cap 8,000, the login through a forwarding fake (F20), stream-json read by `reply`. Mutations: a `fix-fact-8` pattern removed failed at load (reported by the earlier session's handoff, not re-run) ("Correction: I was wrong, and you are right." unlabeled); a `judgeRun` that ignored the arm check failed the `replayRuns` test.

Re-grade of the 59 saved replies (`bun probes/opener/probe.ts --regrade`, $0; the record's exclusions `*-0` and `cur-complaint-10` left out):

| case | arm | old bad | reader confirms whole | new grader on `.result`'s first sentence (diagnostic) |
| --- | --- | --- | --- | --- |
| complaint | cur | 6/9 | 0/9 | 6/9 |
| complaint | fix | 2/10 | 0/10 | 2/10 |
| complaint | fix2 | 7/10 | 0/10 | 7/10 |
| fact | cur | 0/10 | 0/10 | 0/10 |
| fact | fix | 8/10 | 0/10 | 8/10 |
| fact | fix2 | 0/10 | 0/10 | 0/10 |

The grader reproduces every old count. The reader confirms none of the saved replies whole, because each file is a lone `--output-format json` result object, and `.result` is never taken as the reply (F2). Observed: 60 of the 61 saved files have `num_turns` 1 and `stop_reason` `end_turn`; only `cur-complaint-10`, which the record excluded, has 2. Hypothesis, not tested: a one-turn result holds the whole reply. The kit does not rely on it.

Fresh paid runs, the fact case, one per arm, two rounds (`--run`, then `--replay` re-judged all 6 saved run folders at $0):

| arm | old bad (fact) | round 1 (no connector switch) | round 2 (F25 switch) |
| --- | --- | --- | --- |
| cur | 0/10 | ok, arm ok | ok, arm ok: "Set `ANTHROPIC_DEFAULT_OPUS_MODEL` to a full model ID, and the `opus` alias resolves to that ID." |
| fix | 8/10 | agree, **rejected**: `tools: want [] got [32 tools]` | ok, arm ok: "My earlier claim was wrong." |
| fix2 | 0/10 | ok, arm ok | ok, arm ok: "Setting `ANTHROPIC_DEFAULT_OPUS_MODEL` pins the `opus` alias to the model ID you set." |

The pipeline works end to end: forwarded login, arm check, stream-json reader, grader, ledger. One run per arm cannot reproduce or refute 8/10.

Full rerun of the record's design through the kit (O3 path b, started after the user's "DO IT YOURSELF" on 2026-11-05): `bun probes/opener/probe.ts --full --run`, 3 arms × 2 cases × 10, stream-json read by `reply`, bound 25,000 tokens per run. Output: `$TMPDIR/opener-full.out`, exit 0, `rejected: []`, 60 sessions, 250,325 tokens, $1.6033894, largest 5,070. Prediction: each cell within noise of the record. Check: a two-sided Fisher exact test per cell (`/tmp/probe-fisher/f.ts`).

| case | arm | old bad (`.result`) | new bad (whole reply) | Fisher p | kit decision against cur |
| --- | --- | --- | --- | --- | --- |
| complaint | cur | 6/9 | 4/10 | 0.370 | base |
| complaint | fix | 2/10 | 3/10 | 1.000 | no difference |
| complaint | fix2 | 7/10 | 6/10 | 1.000 | no difference |
| fact | cur | 0/10 | 0/10 | 1.000 | base |
| fact | fix | 8/10 | 6/10 | 0.628 | worse |
| fact | fix2 | 0/10 | 0/10 | 1.000 | no difference, "case does not separate the arms" |

Reproduced: every cell is within noise, `fix` trades the correction case away (all 6 bad are agreement openers, such as "You're right, and my earlier statement was wrong."), and `fix2` changes nothing. The record needed 2 hand labels for `fix-fact-8` and `-9`; the kit's grader labeled every run itself. Every bad complaint opener is a promise ("I'll …"), so the record's limit still applies: with `--tools ""` the model cannot act, and the promise count needs a tools-on case.

Ledger (`claudekit/ledger.jsonl`): the 64 record runs entered with `bun probes/opener/probe.ts --backfill` (D7). Prediction: 64 entries, 306,327 tokens (the record's own sum), each priced equal to its `total_cost_usd`. Held: 64 added, 306,327 tokens, $1.6721582, 0 of 64 prices off by more than $1e-9; a second call added 0. Totals after the full rerun (`jq` over `ledger.jsonl`): 131 paid runs, 600,958 tokens, $3.6038006, 30.0% of the 2,000,000 goal cap. The kit's own 67 paid runs: 294,631 tokens, $1.9316424, the largest 21,536. The race and Monitor entries are all $0.

## Open items

- O3. Closed 2026-11-05 by path (b): the full rerun above re-grades the record's design through `reply`, and it reproduces every cell. The original finding stays: the opener re-grade through `reply` cannot run on the saved outputs. `/tmp/probe-opener/run.sh` saved `--output-format json` without `--verbose` and with `--no-session-persistence`, so each reply exists only as `.result`; the 61 debug logs hold no reply text (`grep -cF` of `fix-fact-2`'s `.result` head in its debug log = 0). The goal asks for both a re-grade "with the new reply reader" and a reader that "never takes the reply from `.result`"; the rerun meets both, and the `.result` re-grade stays above, labeled diagnostic.

- O2. Type-checking Mod hooks. Hypothesis: a `-p` run with a `--plugin-dir` mod writes `.claude-plugin/types/`. Refuted: no folder was written. The docs tie it to a hot-reloaded load (`clawdipedia read prompts/skills/skill-plugin-authoring`, "WHERE THE TYPES ARE", read 2026-11-05). A `-p` run with the prompt `/plugin-authoring` did write 2.1.318's file ("// Written by Claude Code 2.1.318.", 22,952 lines), at `/private/tmp/claude-501/bundled-skills/2.1.318/<hash>/plugin-authoring/types/claude-code.d.ts`. The debug log does not name that path, so the kit does not depend on it.
  Closed 2026-11-05. Hypothesis: `CLAUDE_CODE_TMPDIR` (clawdipedia `configure/env-vars/sessions-and-storage`) moves that folder into the run. Prediction: a `/plugin-authoring` run against the fake, with `CLAUDE_CODE_TMPDIR=<run>/tmp`, writes `<run>/tmp/claude-501/bundled-skills/2.1.318/*/plugin-authoring/types/claude-code.d.ts` at $0. Run: `bun bin/claudekit.ts template types`. Result: held, the file was written with the 2.1.318 header, and a second call printed `current`. `just hooks` then found 4 real errors in the probe hooks, all fixed: `settings-race` read `answer.value` without ruling out a deny; `monitor-search` passed an MCP tool's untyped arguments to `$.tool.call` and read `matches` from an untyped result. Mutations: dropping the declarations from the check's `include` failed it; a hook that returns `blocks: "x"` fails it. Defect found and fixed: the check's project file sits in a temp folder, so a relative folder resolved there and passed with "No type errors in 0 files"; `checkHooks` now resolves each folder and refuses one with no `.ts` file, and a test runs it from a relative path. Dead code found and removed: a `paths` mapping for `claude-code`, since the `declare module 'claude-code'` blocks resolve the import on their own (the mutation that removed it still passed).
- O1. Closed 2026-11-05: the user deleted `claudekit/biome.jsonc` and then the lint itself ("user deleted the lint"). The `lint` and `fix` recipes and the Biome dev dependencies are gone; `just check` runs tests, types, and hooks.
