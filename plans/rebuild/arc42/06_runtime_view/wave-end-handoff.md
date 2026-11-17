# Wave End Handoff

- [ ] **RT-029** claudetto shall have an orchestrator that works in waves of concurrent batches, fenced by file ownership, clear its own context at the end of each wave at a safe boundary and hand off to a new iteration of itself.
  Acceptance: After a wave ends, a new iteration starts from the handover with no wave-1 context. Verification: demonstration.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xh0zpx-token-maxxing-a-guide-to-running-20261028T060441Z.md:156 (url: https://www.reddit.com/r/ClaudeAI/comments/1xh0zpx/token_maxxing_a_guide_to_running_unlimited_agents/).
