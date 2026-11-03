# What the Classifiers Read

Read on 2026-11-02 from Claude Code `2.1.316`. One classifier judges a call. With the `classifierModel` option off, the built-in auto mode classifier reads the lists that `plugins/claudetto/src/automode/rules.ts` writes to `autoMode`, and Claude Code builds its input. With it on, the `classify` block builds its own input in `plugins/claudetto/src/blocks/classify/transcript.ts`, and its `PreToolUse` verdict, `allow` or `deny`, settles the call before the built-in classifier runs. A probe on the fake Messages API of `claudekit/api/fake.ts` showed this for one `Bash` call in `--permission-mode auto`: with no hook, Claude Code sent 10 classifier requests; with a hook that answers `allow`, it sent none.

The captures below came from `claudekit/dump/main.ts`, which resumes rows of a saved session and writes what `$.session.messages()` returns before the next tool call. The slice was rows `1697d199` to `aad96f1a` of a session of this repository: Stop hook feedback, the typed "Approved.", and an `AskUserQuestion` answer.

## The Forms a User Message Takes

| Form | JSONL row | Row form (`$.session.messages()`) | API form (`{ as: "api" }`) |
| --- | --- | --- | --- |
| Typed prompt | `user`, `origin.kind` `human` | `{ role: "user", text: "Approved." }` | a text block |
| Stop hook feedback | `user`, `isMeta: true`, string content | dropped | a text block `Stop hook feedback: …` in the same message as the typed prompt after it |
| Prompt typed while a turn runs | `attachment` of type `queued_command` | dropped | a text block after a `tool_result` |
| `AskUserQuestion` answer | `user` with a `tool_result` whose text starts `Your questions have been answered:`, and `toolUseResult.answers` | `{ role: "user", text: "", toolResults: [{ text: "Your questions have been answered: …" }] }` | a `tool_result` block |
| `ExitPlanMode` approval | not captured: no saved session of this login holds an `ExitPlanMode` result | | |

The API form of the captured slice merged four text blocks into one user message: two `<system-reminder>` blocks, `Stop hook feedback: [/openspec-apply-change]: …`, and `Approved.`. The row form held `Approved.` alone.

## The Built-in Classifier

The `2.1.317` program holds the string `User answered AskUserQuestion` once, in the classifier prompt, at byte offset `265453939` (`LC_ALL=C grep -a -b -o -F`). The prompt says a user message prefixed `[User answered AskUserQuestion]:` is the user's answer and direct user intent. The old offset `263516608` was for `2.1.316` and does not reproduce on `2.1.317`. The builder bullets below come from the `2.1.316` read and were not re-read on `2.1.317`. The builder walks the JSONL rows, not the API form, and gives each user row a frame:

- A typed row (`human` or `relay-human` frame) becomes a user message, so "Approved." after Stop hook feedback reaches it as the user's.
- An `isMeta` row with no provenance is `invisible` and dropped, which is where the Stop hook feedback goes.
- A `queued_command` attachment in a human frame becomes a user message in its place between calls.
- An `AskUserQuestion` result that is not an error becomes a user message `[User answered AskUserQuestion]: …`, and the classifier's prompt credits the picked option as the user's intent.
- Any other `tool_result` is dropped.

claudetto cannot change this input. It writes only the rule lists.

## The `classify` Block

`transcriptOf` reads the row form and keeps two kinds of line: `User: <text>` for each user row with text, and `Agent ran: <tool> <input>` for each call. Prompts typed while a turn runs are recorded at `prompt.submit` and placed after the call they followed.

It keeps two tool results as user lines, because the harness writes them when the person picks and the agent does not:

- An `AskUserQuestion` answer that is not an error, as `User: User answered AskUserQuestion: <text>`. Captured row:
  `{"role":"user","text":"","toolUses":[],"toolResults":[{"tool_use_id":"toolu_015nCZNp4nifHrtp1LfChgCj","text":"Your questions have been answered: …"}]}`
- An `ExitPlanMode` result that is not an error, as `User: User approved the plan the agent proposed above.` No saved session holds one, so this row form is assumed, not captured.

It drops:

- Assistant prose, because the agent can argue for itself in it.
- Every other tool result, for the same reason.
- Stop hook feedback, which the row form already drops.
