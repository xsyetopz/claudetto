# Tool Text And Surface

- [ ] **CC-027** claudetto shall keep tool and hook texts neutral and factual, and put validation gates in code.
  Acceptance: a tool-result text states the fact, not a verdict (the model carries the tone of tool-result text into its reply: "NOT SENT, domain cannot receive email" became "your email bounced"; "payment failed due to suspicious activity" became a fraud lecture for an expired card); a validation gate, such as a DNS MX check before the creating tool, sits in code, not in prompt. Verification: inspection.
  Basis: reported (one user, 2026-10-21). Status: missing at 088a227c (the audit of hook messages is not done).
  Source: external/please-use-me-often/agent-failure-dossier/judged/tool.jsonl:33; external/2026-10-21/reddit.com-r-claudeai-comments-1xbipii-claude-invented-an-email-bounce-20261021T101718Z.md:33 (url: https://www.reddit.com/r/ClaudeAI/comments/1xbipii/claude_invented_an_email_bounce_that_never/).

- [ ] **CC-028** claudetto shall keep few, well-scoped tools: typed params with examples, actionable errors "X failed because Y; try Z", idempotent retry-safe tools with 3-5 bounded retries, backoff, jitter, and circuit breakers; tests cover timeout, empty, malformed, and partial results. Skills, MCPs, and agent files are audited about every 3 months.
  Acceptance: each tool error names cause and next step. Cost reference: 50+ MCP tools take about 72k tokens. Verification: inspection.
  Basis: reported. Status: partial at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/judged/tool.jsonl:4.
