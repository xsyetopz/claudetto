# Dead Code Removal By Symbol

- [ ] **RT-032** Dead-code removal runs by symbol where hunks will not compile alone. A new property and every line that touches it are removed together; a group that still will not build without it is skipped, which is a sign it is still wired in. For slow builds the check runs only on the files the diff touches and the test targets that cover them, once before merge, not as a per-edit hook.
  Acceptance: The run costs one pass per change and removes no group that breaks the build. Verification: demonstration.
  Basis: reported, one commenter. Status: missing at 088a227c.
  Source: external/2026-11-03/reddit.com-r-claudecode-comments-1xlr0pk-turning-a-repeated-review-find-20261102T184719Z.md:145; external/2026-11-03/reddit.com-r-claudecode-comments-1xlr0pk-turning-a-repeated-review-find-20261102T184719Z.md:179 (url: https://www.reddit.com/r/ClaudeCode/comments/1xlr0pk/turning_a_repeated_review_finding_into_a_written/).
