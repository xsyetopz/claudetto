# Authority Isolation Test

- [ ] **CC-052** claudetto shall test a sandbox by asking: if the model is fully compromised by prompt injection, can it still read a secret or use it against a destination not approved? Isolating the process is not isolating authority (a container does not help if the real API key sits in the environment). Safer: the agent never holds reusable credentials and asks a separate component for a narrowly allowed request; a credential swap must be tied to the approved host, or the real token can be inserted for a wrong destination.
  Basis: reported (several commenters). Status: missing at 088a227c.
  Source: external/2026-11-03/reddit.com-r-claudecode-comments-1xg1zev-this-tweet-is-a-scary-truth-20261102T184325Z.md:578,625,655-661 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xg1zev/this_tweet_is_a_scary_truth/>).
