# feat-2-1-321: One Decider, Less Code, Checked Text

## Why

The plugins make each bounded judgment a different way. The Stop check sends one long prompt to Haiku and a second to Sonnet, then parses free JSON. The constraint ledger asks Haiku for a whole ledger and then checks its quotes. The branch gate matches English with regular expressions. Each site has its own prompt, parser, timeout, and silent failure path, and none passes `effort` or leaves `maxTokens` room for thinking (200 to 600 tokens, measured in `plugins/*/hooks`).

TypeSafe's Jev answers typed questions with calibrated probabilities at $0.042 per million input tokens, and the plugin already ships a Jev client for the `mcp__claudetto__decide` tool. The `decide` spec bans Jev from every hook, so the client serves one tool.

The code around those sites grew by accretion. Measured on `12a3f8a1`, each figure with its probe in `design.md`: `plugins/claudetto/hooks` holds 9,985 source lines; `isRecord`, `ANY_TOOL`, and the list of writing tools have four definitions each; 64 of 92 `catch` sites bind no error; 2 of the 25 `tool.check` and `tool.call` gating hooks carry a `.catch`, and a guard that throws without one allows the call; and 96% of the installed `claudetto-openspec` plugin (2,291,528 of 2,394,380 bytes) is test data that only Bun-run specs load.

`just check` is red before this change: `verify`, `clones`, and `validate` each exit 1. The change turns it green first.

## What Changes

- **One Decider.** A new module owns every typed question, its options, its thresholds, the Jev client, and the Haiku fallback. Each caller gets a bounded answer (`yes`, `no`, `unsettled`, or an option name) and holds its own truth table in code.
- **Jev in hooks.** **BREAKING:** the ban on Jev in `tool.check` and `Stop` hooks goes. With a key, the hook sites below send session text to `api.typesafe.ai`, redacted by the secret scan first.
- **Haiku 5.5 at `high` effort as the fallback.** A missing key, a refused key (401 or 403), a rate limit, an overload, a network failure, a missed deadline, a request Jev rejects, a failed secret scan, or a state over the size bound sends the same typed questions to `claude-haiku-5-5`. A question Jev leaves in its unsettled band goes the same way at the sites that opt in.
- **Constraint ledger on typed questions.** Code splits the person's message into sentences, and the Decider answers whether each one sets a constraint, which rule it is, what kind of message it is, and whether it lifts an entry. Each entry is the person's sentence, so no entry can hold words the person did not write.
- **Branch gate on a typed question.** A Noul replaces the `DELETES`, `NEGATED`, and `OTHER_BRANCHES` regular expressions in `gate/asked.ts`.
- **BREAKING: one key source.** The Decider and the `decide` tool read `TYPESAFE_API_KEY` from the environment, which means the launching shell or the settings `env` block. A project `.env` file is not read. The `typesafeApiKey` `userConfig` option, which the keychain held, is deleted.
- **Structure.** One registration file per plugin, one definition of each shared helper, `$` passed directly instead of through forwarding interfaces, and no Bun-run test file or fixture inside a plugin folder. Lab tests and their mocks stay, because the lab loads a test only from inside the plugin folder.
- **Faults.** **BREAKING:** the guards are rebuilt. Each plugin registers one `tool.check` hook and one `tool.call` hook, each with one `.catch`, and runs its guards inside them as named functions in a listed order; the 22 matched registrations of `claudetto` go. A `tool.check` fault asks the person and a `tool.call` fault refuses, where a guard without a `.catch` fails open today. Every other caught fault is logged with its cause. The secret scan of a structured tool result reads each string as raw text. The session-start hook adds its lines to the env file once, where today each start adds a copy that every Bash command then runs.
- **Agent-seen text.** Every description fits 200 characters, against 18 of 59 that pass it today, and every model call names its model, its effort, and a measured `maxTokens`. Each prompt, description, and hook text is reviewed against the prompting guides in `clawdipedia-docs`.
- **Removals.** Three dead definitions, three guards for states the engine rules out, the `disable` and `override` paths of the rule vendoring script (its patch file uses only `add`), internal notes in source, and the stale `decideProvider` line in `.env.example`.
- **A machine short of memory holds new work.** Below a free-memory share, a new `Bash` or `Monitor` command or subagent is denied until the agent stops its own runs, because many lint runs at once froze the machine on 2026-11-11.
- **A green baseline.** The two new clones go, the 13 invalid main specs are repaired without a change of meaning, and the two tests that fail only inside the sandbox, which refuses `ps` and `renice`, assert the niceness only where `renice` is allowed.
- **Reported defects.** The person collected 54 reports from 2.1.319 sessions, four of them from the session that recorded them. `design.md` lists each report and sorts them into 44 causes: the answer-first gate that denies work the person asked for, a monitor that never ends, sandbox refusals of git and tool writes, a gate fault on a `grep` pattern, offers and unchecked items that pass the Stop check, replies that apologize, agree, or state feelings where a fact belongs, and others. Each cause is probed before its fix, and each fix that changes a behavior a spec covers adds its delta first.
- **BREAKING: a rebuild on Claude Code's own parts.** An audit of the reports, `ISSUES-2026-11-09-1422.md`, three days of session transcripts (1,959 denial lines), and the dossiers under `external/` gives each mechanism a verdict in `design.md`. A mechanism goes when a Claude Code key, tool, or event does its job, when it has false alarms and no recorded catch, or when it costs more tokens than the fault it stops. Fewer tokens consumed is the first measure, ahead of the price per token. The handoff tool and files, the temp marker, the run logs, the output files, and the start, depth, and time caps go, each replaced by Claude Code's own settings key where one exists; the person approved each removal.
- **Rebuilt built-in tools stay and get cheaper.** The popup tool, the monitor tool, and the `claudetto-you-should-know` plugin are the person's rebuilds of `AskUserQuestion`, `Monitor`, and `cc-plugin-you-should-know@builtin`. Each stays, is compared with the built-in one of Claude Code 2.1.322, and is brought to the same effect in the least code and the fewest characters, with no telemetry, with its options kept, and with each defect found fixed. The built-in one stays disabled. A survey of the other built-in tools rebuilds each one where a mod, a classic hook, a skill, or a command does the job in fewer characters with the person in control.
- **Hygiene that holds the disk.** The disk is 70% full, and the temp rule of the sweep removes nothing, because it needs a marker that no folder has. The sweep is fixed to remove what its rules name, to clean the temp bases by age, and to run often enough.
- **Checks at the earliest event.** Most checks of a reply run at `Stop`, after the work is done. Each check moves to the earliest hook event that sees its fault, and `Stop` keeps only what no earlier event sees.
- **BREAKING: new layout and names.** Each hook file sits in a folder named for its hook type, the event as the engine spells it, and carries a rule key in the form a linter uses, such as `noTempBaseRemoval`. The agents are named for their job: `search`, `plan`, `work`, and `sweep`.
- **Fable and Mythos.** A `sweep` agent runs on `claude-fable-5-2`, or `claude-mythos-5-2` where the account has it, at `high` effort, for a sweep of a system for defects and slow paths. A rebuilt `advisor` tool and command send only the question and the named files to that model, and setup turns the built-in advisor off.
- **General rules.** Setup ships four short rules: find facts by experiment, one obvious way per job, block language with the articles that do work, and look for a clone before writing a function.

Each move to the Decider ships only after a recorded check on stored cases shows it keeps or beats the current behavior, as `mod-architecture` already requires. A site whose check fails keeps its current code, and its delta leaves this change.

## Capabilities

### New Capabilities

- `decider`: The one pipeline that turns typed questions and named state into bounded answers, through Jev first and Haiku 5.5 second.
- `agent-facing-text`: The form every model-seen text and every model call takes.

### Modified Capabilities

- `decide`: The tool reads its key from `TYPESAFE_API_KEY`, and its request rule no longer bans Jev from hooks.
- `constraint-ledger`: The Decider answers per sentence of the person's message, and the ledger is updated in place.
- `permission-policy`: The branch gate asks the Decider whether the person asked for the delete.
- `mod-architecture`: New requirements for registration, shared helpers, shipped folders, and faults.
- `run-limits`: A new requirement holds new work on a machine short of memory.
- `lean-openspec`: The change check warns on a MODIFIED requirement that grows past 500 characters, so a change that validates does not turn a valid main spec invalid at its archive.

Each task of groups 9 and 10 adds the delta of the main spec it touches after its probe confirms the verdict, so this list grows as those tasks run. The verdicts point at `session-handoff`, `session-hygiene`, `you-should-know`, `builtin-rebuild`, `run-limits`, `permission-policy`, `agent-conduct`, `claim-check`, `setup`, `surface-trim`, `subagent-prompts`, and `tier-profiles`.

## Impact

- **Code:** `plugins/claudetto/hooks` (`decide.ts`, `decide/`, `limits/grade.ts`, `verify.ts`, `texts-grade.ts`, `pin.ts`, `gate/asked.ts`, `gate/watch.ts`, `register*.ts`, `limits.ts`, each of the 13 files that registers a `tool.check` or `tool.call` hook, the `SessionStart` command in `hooks.json`, and each file that holds a duplicated helper), `plugins/claudetto-openspec/hooks` and `plugins/claudetto/hooks/secrets.spec.ts` (Bun-run specs, fixture helpers, and fixtures move to `tests/`), `plugins/claudetto-you-should-know/hooks` (one `tool.call` hook, and faults are logged), `scripts/vendor-rules.ts`, and `tools/` (new checks, and `nodeFs`).
- **Specs:** 13 main specs under `openspec/specs/` are repaired so that `just validate` passes.
- **Settings:** `typesafeApiKey` is removed from `plugins/claudetto/.claude-plugin/plugin.json`. The 18 descriptions over 200 characters are shortened: 11 rewritten built-in tool texts, the agent text, three registered tools, two `userConfig` options, and one plugin description (the list is in `design.md`, P26).
- **Data:** With `TYPESAFE_API_KEY` set, the person's messages go to `api.typesafe.ai` after redaction, for the ledger and the branch gate. Without the key, no request reaches that host.
- **Cost:** A Jev request replaces the ledger's Haiku extraction on each typed prompt. The Stop check keeps its Haiku and Sonnet calls, because the claim check's Decider scored below them on held-out cases. The recorded checks and the description eval are paid runs and wait for the person's approval and budget.
- **Docs:** `README.md`, `.env.example`, and `CHANGELOG.md`.
- **Removed for the person, each with the person's approval:** the tool `mcp__claudetto__handoff` with its command and files, the `.created-by-claudetto` marker, `runs.jsonl`, `gate-asks/*.jsonl`, the output files under `.claude/claudetto/output/`, and the `userConfig` options of the caps that a Claude Code key replaces. `CHANGELOG.md` names what replaces each.
- **Kept:** the tools `mcp__claudetto__ask-user-question` and `mcp__claudetto__monitor`, the `claudetto-you-should-know` plugin, and the hygiene sweep.
- **Not changed:** Setup advice stays on Haiku, because its output is a written reason.
