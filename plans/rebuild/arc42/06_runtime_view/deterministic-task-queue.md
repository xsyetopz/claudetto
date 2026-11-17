# Deterministic Task Queue

- [ ] **RT-028** claudetto shall hand a task to a worker as a strict JSON spec (target files, acceptance tests, max retries) in a queue; the worker takes it in an isolated worktree, a test and linter gate decides pass or fail, and the main agent wakes only when the build is green.
  Acceptance: A task with a failing gate never wakes the main agent; each queued spec holds all three fields. Verification: demonstration.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xh0zpx-token-maxxing-a-guide-to-running-20261028T060441Z.md:150 (url: https://www.reddit.com/r/ClaudeAI/comments/1xh0zpx/token_maxxing_a_guide_to_running_unlimited_agents/).
