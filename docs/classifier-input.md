# What the Classifiers Read

One classifier judges a call. With the `classifierModel` option off, the built-in auto mode classifier reads the lists that `plugins/claudetto/src/automode/rules.ts` writes to `autoMode`, and Claude Code builds its input. With it on, the `classify` block builds its own input in `plugins/claudetto/src/blocks/classify/transcript.ts`, and its `PreToolUse` verdict, `allow` or `deny`, settles the call before the built-in classifier runs.

Measured on `2.1.317` with the fake Messages API of `claudekit/api/fake.ts`, for one `Bash` call under `--permission-mode auto` (`bun claudekit/bash-once/main.ts 'echo hi > /tmp/zz; echo done' --permission-mode auto`): with no hook, Claude Code sent 10 classifier requests, each with the command. With `--hook` set to a command that answers `allow`, it sent 0.

## The Built-in Classifier

The classifier request of `2.1.317` (`just capture --classifier`) is 141,962 characters. The `system` field is 140,337, in three blocks of 74, 140,015, and 248 characters, the same for the `plain` and the `plugin` arm. The messages are 616 characters.

The classifier prompt says that a user message prefixed `[User answered AskUserQuestion]:` is the user's answer and direct user intent. It says the question and its options are written by the agent, and it credits the user with the option picked.

The program gives each user row a frame. By the code of `2.1.317`:

- A row with `isMeta` and no provenance is `invisible`, which is where Stop hook feedback goes.
- A typed row is a `human` frame, and a relayed typed row is a `relay-human` frame.
- A `queued_command` attachment in a human frame counts as typed.

What the builder does with every other `tool_result` was not re-read on `2.1.317`.

claudetto cannot change this input. It writes only the rule lists.

## The `classify` Block

`transcriptOf` reads the row form of `$.session.messages()` and keeps these lines:

- `User: <text>` for each user row with text.
- `Agent ran: <tool> <input>` for each call.
- `Hook said: <text>` for a user row that starts with `Stop hook feedback:`. The harness appends what the user types after the feedback to the same message, and the row form joins its text blocks with nothing between them. `hookSplitsOf` reads the API form (`{ as: "api" }`) of those messages to find where the hook's text ends. What follows it is a `User:` line, and the hook's text authorizes nothing.
- A prompt typed while a turn runs, as `User: <text>`. The row form leaves it out, so `onMidTurnPrompt` records it at `prompt.submit` with the id of the newest call, and `transcriptOf` places it after that call.

It keeps two tool results as user lines, because the harness writes them when the person picks and the agent does not:

- An `AskUserQuestion` answer that is not an error, as `User: User answered AskUserQuestion: <text>`.
- An `ExitPlanMode` result that is not an error, as `User: User approved the plan the agent proposed above.`

It drops:

- Assistant prose, because the agent can argue for itself in it.
- Every other tool result, for the same reason.

The `ExitPlanMode` row form is assumed from the code and was not captured on `2.1.317`.
