# feat-2-1-321: One Decider, Less Code, Checked Text

## Why

The plugins make each bounded judgment a different way. The Stop check sends one long prompt to Haiku and a second to Sonnet, then parses free JSON. The constraint ledger asks Haiku for a whole ledger and then checks its quotes. The branch gate matches English with regular expressions. Each site has its own prompt, parser, timeout, and silent failure path, and none passes `effort` or leaves `maxTokens` room for thinking (200 to 600 tokens, measured in `plugins/*/hooks`).

TypeSafe's Jev answers typed questions with calibrated probabilities at $0.042 per million input tokens, and the plugin already ships a Jev client for the `mcp__claudetto__decide` tool. The `decide` spec bans Jev from every hook, so the client serves one tool.

The code around those sites grew by accretion. Measured on `cc07c1c9`: `plugins/claudetto/hooks` holds 9,985 source lines, `jscpd` reports 34.9% duplicated lines across the repo, five copies of `isRecord` exist, about 25 `catch` sites drop the error, and `plugins/claudetto-openspec/hooks/fixtures` ships 57,093 lines of test data inside the installed plugin.

## What Changes

- **One Decider.** A new module owns every typed question, its options, its thresholds, the Jev client, and the Haiku fallback. Each caller gets a bounded answer (`yes`, `no`, `unsettled`, or an option name) and holds its own truth table in code.
- **Jev in hooks.** **BREAKING:** the ban on Jev in `tool.check` and `Stop` hooks goes. With a key, the hook sites below send session text to `api.typesafe.ai`, redacted by the secret scan first.
- **Haiku 5.5 at `high` effort as the fallback.** A missing key, a refused key, a rate limit, an overload, a network failure, or a missed deadline sends the same typed questions to `claude-haiku-5-5`. A question Jev leaves in its unsettled band goes the same way at the sites that opt in.
- **Claim check on typed questions.** One Jev request with one Noul per atomic judgment replaces the Haiku prompt and the parallel Sonnet call. Code maps the answers to the faults.
- **Constraint ledger on typed questions.** Code splits the person's message into sentences, and the Decider answers whether each one sets a constraint, which rule it is, what kind of message it is, and whether it lifts an entry. Each entry is the person's sentence, so no entry can hold words the person did not write.
- **Branch gate on a typed question.** A Noul replaces the `DELETES`, `NEGATED`, and `OTHER_BRANCHES` regular expressions in `gate/asked.ts`.
- **BREAKING: one key source.** The Decider and the `decide` tool read `TYPESAFE_API_KEY` from the environment. The `typesafeApiKey` `userConfig` option is deleted.
- **Structure.** One registration file per plugin, one copy of each shared helper, `$` passed directly instead of through forwarding interfaces, and no test, test support, or fixture inside an installed plugin (version 2.1.319 of `claudetto-openspec` installs 2.2 MB of fixtures).
- **Faults.** A guard hook refuses through a `.catch` instead of failing open, and every other caught fault is logged with its cause.
- **Agent-seen text.** Every description fits 200 characters, and every model call names its model, its effort, and a measured `maxTokens`. Each prompt, description, and hook text is reviewed against the prompting guides in `clawdipedia-docs`.
- **Removals.** Dead exports, guards for states the types rule out, the unused `disable` and `override` paths of the rule vendoring script, internal notes in source, and the stale `decideProvider` line in `.env.example`.

Each move to the Decider ships only after a recorded check on stored cases shows it keeps or beats the current behavior, as `mod-architecture` already requires. A site whose check fails keeps its current code, and its delta leaves this change.

## Capabilities

### New Capabilities

- `decider`: The one pipeline that turns typed questions and named state into bounded answers, through Jev first and Haiku 5.5 second.
- `agent-facing-text`: The form every model-seen text and every model call takes.

### Modified Capabilities

- `decide`: The tool reads its key from `TYPESAFE_API_KEY`, and its request rule no longer bans Jev from hooks.
- `claim-check`: The Decider answers one Noul per judgment in one request, and the Sonnet call goes.
- `constraint-ledger`: The Decider answers per sentence of the person's message, and the ledger is updated in place.
- `permission-policy`: The branch gate asks the Decider whether the person asked for the delete.
- `mod-architecture`: New requirements for registration, shared helpers, shipped folders, and faults.

## Impact

- **Code:** `plugins/claudetto/hooks` (`decide.ts`, `decide/`, `limits/grade.ts`, `limits/verify.ts`, `texts-grade.ts`, `pin.ts`, `gate/asked.ts`, `register*.ts`, `limits.ts`, and each file that holds a duplicated helper), every `plugins/*/hooks` folder (tests, test support, and fixtures move to `tests/`), `plugins/claudetto-you-should-know/hooks` (faults are logged), `scripts/vendor-rules.ts`, and `tools/` (new checks).
- **Settings:** `typesafeApiKey` is removed from `plugins/claudetto/.claude-plugin/plugin.json`. `hygieneEnabled` (307 characters), `protectedPaths` (212), and the `claudetto-you-should-know` plugin description (247) are shortened.
- **Data:** With `TYPESAFE_API_KEY` set, the person's messages, the final reply, and up to 8 tool results per turn go to `api.typesafe.ai` after redaction. Without the key, no request reaches that host.
- **Cost:** A Jev request replaces two model calls at each Stop. The recorded checks are paid runs and wait for the person's approval and budget.
- **Docs:** `README.md`, `.env.example`, and `CHANGELOG.md`.
- **Not changed:** `claudetto-you-should-know` keeps its own Haiku call until a probe shows that one plugin can share a noun with another. Setup advice stays on Haiku, because its output is a written reason.
