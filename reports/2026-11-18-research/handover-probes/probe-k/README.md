# Probe K: turn.step calling next twice (CC-020)

Claude Code 2.1.327, cc-inspect `cli` against the local fake API, prompt "say hi", `--include-partial-messages`, plugin passed with `--plugin-dir`. Fake API, no cost.

Hypothesis: a `turn.step` hook that calls `next` a second time for a new response duplicates streamed text.

Findings:

- A `turn.step` hook must be an async generator, `async function* ($, e, next)`. A plain `($, e, next) => result` handler makes the module scanner refuse the whole module, so none of its hooks run (chunk-dafpvz32.js@63884; `qZo=["turn.step","process.spawn"]` at @4650). The first attempt in this folder failed this way: no log line, one request.
- Variant A (`A/`) yields both `next(e)` streams: 2 requests, log `A first answer="OK"`, `A second answer="OK"`. The stream-json stdout is 5602 characters past the shown prefix, against 3516 for the one-request baseline: the second response is streamed to the client as well.
- Variant B (`B/`) drains the first stream without yielding and yields only the second: 2 requests, log `B first answer="OK" chunks_dropped=7`, `B second answer="OK"`. The stdout is 3525 characters past the prefix, the baseline size: one response is streamed.

Result: a second `next` call always sends a second model request (the `StreamNext` type says the same). The client sees the text twice only when the hook yields both streams. A hook that drains the first stream and yields the second shows one response. The hypothesis is refuted as stated.

Limit: the stream comparison uses stdout length past a fixed prefix, because the tool truncates stdout. The chunk count in the log (7 dropped) and the equal size of variant B and the baseline support it.
