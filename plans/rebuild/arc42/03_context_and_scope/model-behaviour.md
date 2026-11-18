# model-behaviour

## Model Behaviour

- [x] **CTX-872** A refused request can be answered by a different model. Claude Code 2.1.327 has a refusal fallback: the SDK message `system`/`model_refusal_fallback` carries `original_model`, `fallback_model`, `api_refusal_category` (such as 'cyber' or 'bio'), `direction` (retry, revert, sticky) and `scope`, where 'session' swaps the session model and 'local' means only that subagent or side response came from the fallback model (chunk-rj3e7agr.js@526100). Users report Opus 5.5 falling back to Opus 5 on cyber or biology safeguards. claudetto reads this message and the response `model` before it trusts a cache-warm or family check (ADR-0103, ADR-0005), and logs a fallback in the handover.
  Basis: read (program, claude 2.1.327 schema); the Opus 5 target is reported, two commenters.
  Source: external/export-With Opus 5.5 guardrails, they're gonna have to eventually fix the fallback issue.jsonl:2; external/2026-10-12/export-There should be less than 24 combinations of models and effort levels to choose from.jsonl:39; claude 2.1.327 chunk-rj3e7agr.js@526100.
  Verified: binary string search, claude 2.1.327, 2026-11-19: model_refusal_fallback (25 hits) and api_refusal_category (11) are in the bundle; the Opus 5 target stays reported.

