# P41 model path probe: `dcc-plugin-you-should-know`

This is evidence only.
No plugin code was written.
Claude Code version: `2.1.296`, installed at `/Users/krystian/.local/bin/claude`.

## Method

A scratch plugin with one module, `hooks/register.ts`, ran one probe per session.
The `turn.start` hook called `$.model.complete` or `$.model.classify`.
The hook wrote its result with `$.fs.write`.
Each session ran `claude -p "Reply with the word done." --plugin-dir <scratch>`.
The main model call of each session returned `done`.
The hook loader rejects `node:fs`, `process`, and any import other than `claude-code`.
The probe read its mode from a file, because `process.env` is not defined there.

## Answers

1. `$.model.complete` with `model: "haiku"`, `system`, and `maxTokens: 16`:
   the reply was HTTP 429 `rate_limit`, with zero usage.
   The full id `claude-haiku-5-5` gave the same reply.
   Result: `{"isAnswered":false,"reason":"api-error","status":429,"error":"rate_limit",...}`.
   The system prompt was accepted at request build, because the request reached the API.
   It was not checked against a reply.
   The usage and the resolved model id were not seen, because no reply came back.

2. `$.model.classify` with `model: "haiku"`: the call rejected with
   `HooksError: p41-scratch-probe: $.model.classify: the request failed (HTTP 429, rate_limit)`.
   `$.model.classify` with the default model: the same rejection.

3. Three `$.model.complete` calls with a prompt of about 300 tokens (`haiku`, `maxTokens: 16`):
   the waits were 2488 ms, 2578 ms, and 2626 ms.
   Each call returned HTTP 429 `rate_limit`.
   The wait for a call that answers was not measured.

4. Both paths failed.
   The error text is in the answers above.
   The error came from the API.
   The engine passed the HTTP status `429` and the kind `rate_limit` through to the hook.
   The bundle has no local gate that makes a 429 for the model path.
   The bundle has the generic text `the request failed (HTTP` and the `classify` error texts.
   Those texts are how the engine reports an API status.
   The bundle search found no feature flag that turns off `$.model.complete`.

## Recommendation

No model path (rules only), for now.
The hook path got HTTP 429 on every call, for both `complete` and `classify`, while the main thread
call of the same session succeeded.
`complete` is the better path to revisit, because it returns the status, the kind, and the usage.
`classify` is a wrapper over `complete`, and it rejects instead of returning a status.
Revisit the choice when a probe gets a reply, so that the usage, the resolved model id,
and the timing can be measured.

## Second probe, 2026-10-13

A scratch plugin loads its hooks module only when `hooks/hooks.json` lists it, as `{ "modules": ["./register.ts"], "hooks": {} }`.
A `hooks/register.ts` with no `hooks.json` entry is not loaded, and the debug log shows only "Loaded inline plugin".

The probe ran one `$.model.complete` call (`haiku`, `maxTokens: 16`) and one `$.model.classify` call (`haiku`) in a `session.start` hook, with `claude -p "Reply with OK." --model claude-haiku-5-5 --plugin-dir <scratch>`.

| Auth | `complete` | `classify` |
| --- | --- | --- |
| Subscription login of the user | HTTP 429 `rate_limit`, 2705 ms, 0 tokens | HTTP 429 `rate_limit`, 2420 ms |
| `ANTHROPIC_API_KEY`, in a new `CLAUDE_CONFIG_DIR` | answered `OK`, 1038 ms, 21 input and 4 output tokens | answered `no`, 935 ms |

- On a subscription, each model call from a hook gets HTTP 429, also more than 30 minutes after the first probe.
  The main calls of the same session work.
  So the limit applies to calls from hooks on a subscription, and it is not a passing limit.
- With an API key, both calls work in about 1 second.
  The session with the key cost $0.0011 (`total_cost_usd`), and nearly all of it is the main call.
- Not measured: the resolved model id of the hook call, and the tokens of `classify`, which returns no usage.

## Third probe, 2026-10-13: `$.model.fork`

The probe ran one `$.model.fork({ prompt: "Reply with the word OK and nothing else." })` in a `turn.complete` hook, after the main reply, on the subscription of the user.

- The fork answered `OK` in 1005 ms.
- Its usage: 20 input tokens, 4 output tokens, 13,532 cache read tokens, and 3,174 cache write tokens.
- So a subscription can use `$.model.fork` from a hook, while `$.model.complete` and `$.model.classify` get HTTP 429.

## Step 1 of the build, 2026-10-13

The sources are the lines of `plugins/dotclaude/.claude-plugin/types/claude-code/index.d.ts`.

- `tool.check` fires "when the engine decides whether a tool call may run", before the tool runs and before the mode settles an ask (line 3964).
  So a toast from a `tool.check` hook is drawn before the tool runs, and before a permission dialog.
  Not verified in an interactive session: the order on the screen of the toast and the tool output.
- A fork sends "the main thread's last request again" with the prompt after it (line 2629).
  In `tool.check`, the last request is the one whose response holds the pending tool call, so the fork does not see that call.
  So the fork prompt gives the pending action, and it does not give the conversation.
- A fork gives `nothing-to-fork` before the first response and after `/clear` (line 2636).
  The first tool call of a session comes after a response, so `nothing-to-fork` is rare in `tool.check`.
- A toast stays for 4 seconds by default (line 2438), so the plugin gives `timeoutMs: 12000`, for one sentence.

## The Cause of the HTTP 429, 2026-10-13

The 429 does not come from the subscription.
It comes from `CLAUDE_CODE_ATTRIBUTION_HEADER=0`, which the `prompt` slice of the core plugin set, and which the settings of the user held.

Each probe below ran one `$.model.complete` call (`haiku`) in a `session.start` hook, on the subscription of the user, with `claude -p "Reply with OK."`.

| Config | Result |
| --- | --- |
| The real config of the user (`--no-session-persistence`) | HTTP 429 `rate_limit`, 2,462 ms |
| A clean sandbox config | Answered, 819 ms |
| A clean sandbox config with all the settings of the user | HTTP 429 |
| A clean sandbox config with only the `env` of the user | HTTP 429 |
| A clean sandbox config with only `CLAUDE_CODE_ATTRIBUTION_HEADER=0` | HTTP 429, 2,548 ms |
| A clean sandbox config with each other `env` key alone | Answered, 737 to 974 ms |
| `CLAUDE_CODE_ATTRIBUTION_HEADER=0`, and the call gives `system: "You are a Claude agent, built on Anthropic's Claude Agent SDK."` | Answered, 864 ms |

The captured request bodies show why:

- With the header on, the `system` of a `$.model.complete` request starts with the block `x-anthropic-billing-header: cc_version=...; cc_entrypoint=sdk-cli;`.
- With the header off, the request has no such block and no identity block of Claude Code.
  The type file says that a completion has "the CLI's identity block" (line 2602), but the captured request has none.
- The main request with the header off starts with the identity block `You are a Claude agent, built on Anthropic's Claude Agent SDK.`, so the main calls work.
- A fork sends the main request again, with its identity block, so a fork works.

Inference: on a subscription, the API accepts a request only when it carries the billing block or the identity block of Claude Code.
A separate call from a hook with the header off carries neither, so the API refuses it with 429.
The earlier variable test missed the cause, because the sandbox removes each variable that has the same value as the `env` of the settings of the user.

Decision (the user, 2026-10-13): the attribution header stays on, so the core plugin no longer sets `CLAUDE_CODE_ATTRIBUTION_HEADER=0`.
The plugin keeps the switch to a fork after a 429, for a user who sets the variable.

## Sandbox Sessions, 2026-10-13

Each session ran headless in a sandbox config with only `plugins/dcc-plugin-you-should-know` and `cc-plugin-you-should-know@builtin` off, with `claude-sonnet-5-5`.
The prompt asked for one edit of `src/retry.mjs`.
The debug log gives the wait of each hook call, and the `count_tokens` API counted the captured requests.

| Path | Model call | Wait of the check | Tokens of the call | Topic |
| --- | --- | --- | --- | --- |
| Subscription, header on | `$.model.complete` on `claude-haiku-5-5` | 2,430 ms, and 2,216 ms in a second run | 412 input | Yes, both runs |
| API key, header on | `$.model.complete` on `claude-haiku-5-5` | 3,017 ms | 411 input | `NONE` |
| Subscription, `CLAUDE_CODE_ATTRIBUTION_HEADER=0` | 3 tries of `$.model.complete` that got 429, then `$.model.fork` (772 ms) | 2,850 ms | 16,731 input on `claude-sonnet-5-5`, nearly all of it a cache read of the conversation | `NONE` |

- The engine tried the separate call 3 times before the 429 stood, so the switch costs about 2 seconds one time in a session.
- The output of a call is one sentence or `NONE`, about 4 to 50 tokens.
- The cost of the session does not show the cost of the check, because the cache state of the main requests differs between runs.

## Interactive Session, 2026-10-13

One session ran in the TUI in `tmux`, on the subscription with the header on, with the prompt to make `retry` try forever with no delay.

- The toast showed at 01:14:05.283, with the topic "This makes `retry` loop forever with no delay and silently discard every error, ...".
- Claude Code wrote `src/retry.mjs` at 01:14:05.306, 23 ms after the toast.
- A frame of the screen shows the toast at the top right, over the transcript.
  So the notice shows before the action that it is about.
