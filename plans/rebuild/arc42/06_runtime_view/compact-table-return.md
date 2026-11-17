# Compact Table Return

- [ ] **RT-003** The decision server reads files itself so contents never enter Claude's context, screens every item, sends them in parallel with back-off, and returns a compact table of accept, look, and decide rows plus totals and a cost line; Claude reads only the decide rows. Per-question confidence bands are re-measured against real outcomes, because generic 0.8/0.2 thresholds left 80% of a backlog borderline. Advisory accuracy against the author's own ground truth: 16/16, 92/97, 18/18, 6/6.
  Basis: measured, one author.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbxoza-my-claude-code-setup-it-runs-l-20261022T005342Z.md:85 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xbxoza/my_claude_code_setup_it_runs_like_a_small/>).
