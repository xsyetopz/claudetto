# Model Switches against a Fake API (issue #62)

Claude Code 2.1.327 announces every model switch on the main loop. One path switches with no `model_fallback` message: a compaction that fails on an overloaded model while `--fallback-model` is set. claudetto changes none of these paths. Measured 2026-11-20 at $0 (no paid model calls).

## Method

`stub.ts` is a local Messages API that logs each request's model, effort, thinking and system size, and fails by mode: `overload` (529 on one model), `server` (500), `compact` (529 on a compaction request, detected by the summary prompt text). `run.sh <out> <binary> [plugin-dir]` runs seven cases in print mode with `--output-format stream-json --setting-sources ""`, and `show.py` prints the client-visible events and the requests. Output: `van.txt` (vanilla) and `cto.txt` (`--plugin-dir plugins/claudetto`); the two differ only in system size and in how many retries fit before the 150 s cut.

## Results (vanilla and claudetto identical, except system size 5,887 bytes with claudetto)

| Case | What the client shows | Served model |
|---|---|---|
| 529 on Sonnet, `--fallback-model claude-haiku-5-5` | 2 `api_retry`, then `model_fallback` trigger `overloaded`, "Switched to Haiku 5.5 due to high demand for Sonnet 5.5" | Haiku; `assistant.model` and `modelUsage` name it |
| 529 on Sonnet, no fallback model | 9 or 10 `api_retry` on Sonnet before the 150 s cut (timing); no switch | Sonnet only |
| 500 on Sonnet, `--fallback-model` | `model_fallback` trigger `server_error` | Haiku, named |
| `/compact` with 529 on Sonnet, `--fallback-model` | `status: compacting`, `compact_boundary`; no `model_fallback` message | summary written by Haiku after 3 Sonnet attempts; only `modelUsage` lists Haiku |
| `/compact` with 529, no fallback model | `status: compacting` repeats; no switch (cut at 150 s) | Sonnet only |
| `--model claude-sonnet-5-5 --effort high` | normal | system 5,886 bytes, effort `high` |
| `--model claude-zeta-9-1 --effort high` (unrecognised) | normal | system 5,886 bytes, effort `high` kept |

The compaction chain is built from `options.fallbackModel` (chunk-m14bt1pz.js@2961257-2962400) and retried at chunk-m14bt1pz.js@2967072, which logs "Compact: model fallback triggered" but emits no stream message. The unrecognised model got the same system prompt and effort as a known one, so the short-prompt and dropped-effort behaviour named in RISK-193 (2.1.310, 2.1.312) is absent on 2.1.327.

Outcome: RISK-193 (plans/rebuild/risk-register/delegation.md).
