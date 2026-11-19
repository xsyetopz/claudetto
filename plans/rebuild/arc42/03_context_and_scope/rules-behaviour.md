# rules-behaviour

## Rules and Model Behaviour

## Rules and Model Behaviour

## Rules and Model Behaviour

## Rules and Model Behaviour

## Rules and Model Behaviour

- [x] **CTX-483** Claude Code 2.1.323 hook types, checked against the 2.1.327 Mod API declarations: `prompt.submit` returns `context` blocks for per-turn reminders; `session.compact` `instructions` plus `classic.SessionStart` with source `compact` carry a rule through compaction; `classic.Stop` blocks while `turn.complete` cannot; `tool.check` enforces commit and scope bans; the `session.compact` `messages` field lets a plugin keep a message whole by its handle (`prompt.submit` result `context`, `session.compact` input `instructions` and `messages` with handles: clawdipedia get_schema "types", 2026-11-18, cache; the events `prompt.submit`, `turn.complete`, `session.compact`, `tool.check`, `classic.Stop`, `classic.SessionStart` listed by cc-inspect surface mod-api on 2.1.327). A run that shows `classic.Stop` blocking, or `tool.check` denying a commit, was not made here: the declarations carry the types and a blocking run needs a plugin probe.
  Basis: cited, clawdipedia get_schema "types" (PromptSubmitResult, SessionCompactInput; badge: clawdipedia.cc cache, fetched 2026-11-18) and read from the 2.1.327 binary (cc-inspect surface mod-api); the blocking behaviour of each hook is declared, not run.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-community.md:47-55.
  Verified: source already on 2.1.327.
  Verified: re-run on claude 2.1.327, 2026-11-19: partial: declarations only; prompt.submit/turn.complete/session.compact/tool.check literals x>0 in 2.1.327 binary (tool.check x47); item itself says no blocking run was made

## Rules and Model Behaviour

## Rules and Model Behaviour

## Rules and Model Behaviour

## Rules and Model Behaviour

- [x] **CTX-498** A 'be clear and concise' prompt steers the final text but is not a token saver and can raise thinking tokens; a prompt naming the reader (who installs it, what they need) works better than a length limit.
  Basis: measured, in part refuted (paid run, Sonnet 5.5, 2.1.327, one README task, 5 runs per arm, `--append-system-prompt`, reports/2026-11-18-research/paid-labs/README.md). At effort high, "Be clear and concise." did not raise thinking (median 96 thinking tokens, against 113 with no line) and cut the reply by about 15%. A line naming the reader roughly doubled thinking (median 208) but gave the shortest total output (median 412 output tokens, against 504) and less than half the reply text. At effort medium no arm thought (0 thinking tokens). The naming-the-reader advice holds; "concise raises thinking" does not.
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xoj99r-vibecoders-i-beg-you-when-postin-20261109T153436Z.md:227,326,334 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xoj99r/vibecoders_i_beg_you_when_posting_your_app_or/>).
  Verified: source already on 2.1.327.
  Verified: not re-run 2026-11-19: prompt-style opinion; nothing local to run

## Rules and Model Behaviour

## Rules and Model Behaviour

## Rules and Model Behaviour

## Rules and Model Behaviour

## Rules and Model Behaviour

## Rules and Model Behaviour

## External Sweep, 2026-11-18

