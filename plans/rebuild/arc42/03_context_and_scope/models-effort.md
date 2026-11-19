# models-effort

## Models and Effort

- [x] **CTX-725** `alwaysThinkingEnabled` false cannot turn thinking off on the -5-5 models: the setting makes the config disabled, but the catalog capability `rejects_disabled_thinking` turns it back to adaptive. The same holds for `MAX_THINKING_TOKENS=0`, `--thinking disabled`, and a project file, on opus and sonnet. Only `CLAUDE_CODE_DISABLE_THINKING=1` removes the field, and the real API accepted a haiku-5-5 request without it (1 turn, 17,194 prompt tokens, 42 output, $0.00346)
  Basis: measured, paid.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1305.
  Verified: not re-run 2026-11-19: measured on a real haiku request ($0.00346); static: rejects_disabled_thinking x4 and CLAUDE_CODE_DISABLE_THINKING x6 present in 2.1.327 binary

## Models and Effort
  Verified: binary string search, claude 2.1.327, 2026-11-19: rejects_disabled_thinking (4 hits), alwaysThinkingEnabled (15), and MAX_THINKING_TOKENS (8) are in the bundle; the adaptive result of each setting stays as measured with paid runs and is not rerun.

- [x] **CTX-736** Prompt cache mechanics: the prefix cache is keyed on model, system prompt, project context, and history; read costs about 0.1x, a 5m write 1.25x, a 1h write 2x; every hit resets the TTL; any change earlier in the prefix (MCP reconnect reordering tools, effort or model switch) invalidates from that point; a subscription main session defaults to a 1h TTL (drops to 5m over plan limit), the API per-token 5m; editing a prompt via `/rewind` is a hit; advisor calls re-send full context uncached. Tip: `/compact` before a break longer than the TTL. Docs cited: code.claude.com/docs/en/prompt-caching. Posts disagree on whether Pro gets 5 m or 1 h; anthropics/claude-code#46829 tracks it (reported).
  Basis: cited, reported. 2.1.326: `CLAUDE_CODE_PROMPT_CACHE_TTL`, `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL`, `CLAUDE_CODE_MESSAGES_PROMPT_CACHE_TTL` present (binary string search). Baseline: partial (59-minute age rule in `handoff.ts`; cache gate missing).
  Conflict: claudetto shall rely on these cache facts.
  Source: external/2026-10-11/export-How prompt caching works in Claude Code (and how to stop wasting tokens).jsonl:2 (url: <https://www.reddit.com/r/ClaudeAI/comments/1uih6w7/how_prompt_caching_works_in_claude_code_and_how/>); external/please-use-me-often/agent-failure-dossier/judged/cache.jsonl:7; <https://code.claude.com/docs/en/prompt-caching> (not re-read); external/2026-10-11/export-How prompt caching works in Claude Code (and how to stop wasting tokens).jsonl:14 (url: <https://www.reddit.com/r/ClaudeAI/comments/1uih6w7/how_prompt_caching_works_in_claude_code_and_how/>).
  Verified: not re-run 2026-11-19: cached-docs and forum-report mechanics; nothing local to run (docs prompt-caching page not read)

## Models and Effort
  Verified: binary string search, claude 2.1.327, 2026-11-19: CLAUDE_CODE_PROMPT_CACHE_TTL (6 hits) and CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL (6) are in the bundle; the mechanics, TTL defaults by plan, and the Pro dispute stay cited or reported and are not claimed as verified.

- [x] **CTX-750** Explore follows the main model. `CLAUDE_CODE_SUBAGENT_MODEL=haiku` needs `_FORCE=1` to cover Explore and Plan.
  Basis: cited (docs).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/reddit-1.md:26 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x0kzbh/haiku_55_is_40x_cheaper_than_opus_55_your_explore/>.)
  Verified: docs search (clawdipedia-docs subagent runtime and frontmatter pages), claude 2.1.327, 2026-11-19: CLAUDE_CODE_SUBAGENT_MODEL and CLAUDE_CODE_SUBAGENT_MODEL_FORCE are documented, the former choosing the subagent model after the per-call model and the agent field; the Explore and Plan coverage by _FORCE was not separately probed; binary string search finds both names (20 and 18 hits).
  Verified: not re-run 2026-11-19: Explore/Plan model routing not probed; static: CLAUDE_CODE_SUBAGENT_MODEL_FORCE x18 in 2.1.327 binary

- [x] **CTX-847** On claude 2.1.327 the effort sent in `output_config.effort` resolves as follows:
  - Within one settings file, `modelSettings.<model>.effortLevel` wins over the top-level `effortLevel`. A file with `effortLevel` high and a saved low for Opus 5.5 sent low.
  - Across files, the higher-precedence file wins. A project `modelSettings` low plus a `--settings` `effortLevel` high sent high.
  The docs give medium as the default effort for Opus 5.5, Sonnet 5.5, Haiku 5.5 and Fable 5.2. They also say Claude Code saves levels for supported models. REQ-SETUP-006 already writes per-model levels, so it needs no extra step; a top-level `effortLevel` written alone would lose to a level saved in the same file. A thread reports a fifth level, `max`, for Opus 5.5. The docs accept `max` in `maxEffortLevel` but not in `effortLevel`.
  Acceptance: a setup change that writes effort writes it per model in `modelSettings`. Verification: probe.
  Basis: measured (four probe arms, cc-inspect cli on a fake API, 2026-11-18); cited (clawdipedia configure/settings/model and configure/models-and-providers/effort-thinking-and-fallback, Claude Code 2.1.327). Status: n/a (Claude Code behaviour).
  Source: reports/2026-11-18-research/surface-probes/settings-probes.md; <https://clawdipedia.cc/configure/settings/model>; external/2026-11-18/reddit.com-r-claudeai-comments-1xzaylf-what-is-the-difference-in-effort-20261118T120449Z.md:69 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xzaylf/what_is_the_difference_in_efforts_for_opus_55/>); reports/2026-11-18-research/dossier.md:160.
  Verified: source already on 2.1.327.
  Verified: re-run on claude 2.1.327, 2026-11-19: re-run via cc-inspect cli 2.1.327: settings effortLevel high + modelSettings.claude-opus-5-5.effortLevel low with --model claude-opus-5-5 sent output_config {"effort":"low"} (request 1 body tail); the cross-file arm not re-run

- [x] **CTX-851** Claude Code 2.1.327 keeps every earlier thinking block in context. Whenever a request has thinking on, it sends the context edit `{type: "clear_thinking_20251015", keep: "all"}` (`nNn({hasThinking})`, chunk-m14bt1pz.js@1895932, called at @3281600). The value is fixed in code, for every thinking model, with no setting or environment variable to change it. A user report says Fable 5.2 "context poisons itself": a wrong idea in its thinking stays in context and steers later turns. The mechanism is real and applies to all models, not only Fable. The fix in claudetto's control is to end the context, not to edit it: renewal at task boundaries (ADR-0178) and short-lived workers (REQ-DELEGATION-065) drop old thinking, and a review runs in a fresh subagent whose context holds none of the author's thinking. The same report and its thread add three things the plan already covers: a model that says "you're right, I overstated" when challenged, without checking (REQ-REPLY-045, OUT-166); a model that asks again a question it has already recorded as answered (REQ-HANDOVER-068 carries decisions forward; within a session the answer is in context); and one user who keeps context under 400,000 tokens and reports no drift (CTX-445). One user's three-way refactor (Fable 5.2, Opus 5.5, a third-party model) found Fable introduced more regressions at higher cost (n=1, one user's account, kept as reported) and does not change routing: Fable and Opus stay root-session models (CTX-733, CTX-848).
  Acceptance: no claudetto prompt or hook tries to remove thinking blocks from context; handover and worker design are the only answer to thinking carried across turns. Verification: inspection.
  Basis: code read (claude 2.1.327, cc-inspect `code search` "clear_thinking" and "nNn({", 2026-11-18); reported (Discord thread, n=1 per claim). Status: n/a (Claude Code behaviour).
  Source: chunk-m14bt1pz.js@1895932 and @3281600 (claude 2.1.327); user-pasted Claude Discord log, 2026-11-18 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e.jsonl:4010).
  Verified: re-run on claude 2.1.327, 2026-11-19: code search `clear_thinking_20251015` on 2.1.327: chunk-m14bt1pz.js@1895932 `function nNn(e){let{hasThinking:n=!1,toolClearing:o}...if(n)u.push({type:"clear_thinking_20251015",keep:"all"})`; no plugin .ts file strips thinking blocks

## External Sweep, 2026-11-18
  Verified: source already on 2.1.327.

