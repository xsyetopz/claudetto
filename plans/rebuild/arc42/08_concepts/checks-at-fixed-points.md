# Checks at Fixed Points

- [ ] **CC-055** claudetto shall run a code-health score at three points (before a risky edit, before commit, before the PR), not per keystroke, and treat the PR check as the winner on disagreement; AGENTS.md is a note agents skip, not a gate.
  Acceptance: per-keystroke scoring makes the agent thrash and the ticket never finishes; the same score runs in the session, on the laptop before commit, and on the PR. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-10-30/reddit.com-r-claudeai-comments-1xft6w1-the-agent-cleaned-up-our-access-20261029T120116Z.md:43 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xft6w1/the_agent_cleaned_up_our_access_check_and_left/>).
