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
