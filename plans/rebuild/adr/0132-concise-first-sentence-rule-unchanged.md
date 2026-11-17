---
status: accepted
date: recorded in openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3401 (day of decision not recorded)
---

# The Concise First-Sentence Rule Stays As Shipped

## Context and Problem Statement

Session 2913471d opened a reply with agreement after a complaint. Does a different opener rule cut bad openers?

## Considered Options

- `cur`: the rule as shipped. Complaint 6 of 9 bad openers (promise), correction 0 of 10.
- `fix`: "Open every reply with ... never with agreement, praise, apology, or a promise of what you will do". Complaint 2 of 10, correction 8 of 10 (agreement).
- `fix2`: `cur` plus "or a complaint about your work" in the trigger. Complaint 7 of 10, correction 0 of 10.

## Decision Outcome

Chosen: keep `cur`; neither fix ships. `fix` trades the complaint case for the correction case; `fix2` changes nothing. Paid A/B on claude-opus-5-5: 64 runs, 306,327 tokens, $1.67, running total $13.58. Confound: with `--tools ""` the model cannot act, so "I'll ..." is its only form of next action; a tools-on case is needed.

## Consequences

The opener rule is not changed on this evidence.

Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3401.
