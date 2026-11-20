---
status: accepted
date: recorded in openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:147 (day of decision not recorded)
---
# Auto Mode Classifier Route

## Context and Problem Statement

Auto mode needs a classifier for tool calls. Route A uses the stock first-party server classifier plus the `autoMode` lists that setup writes. Route B is a `tool.check` hook (`hooks/classify.ts`) that asks Jev, then `claude-haiku-5-5`.

A `tool.check` Mod can judge a core ask in auto mode with the user's `autoMode` lists (5,429 bytes). Should claudetto ship it? Goal item 10 rule: adopt the Mod if it matches and costs less.

## Considered Options

- Route A: the stock classifier with trimmed `autoMode` lists written by setup.
- Route B: a `tool.check` judge of those lists (Jev, then haiku).
- Ship the judge Mod (task 5.28). On first party it adds about 5,000 chars, 1,725 billed tokens, and about 3.5 s per ask; it beats the stock 63,413 plus 712 chars only on the local fallback (gateway, fake API).
- Keep the stock route. On first party the stock route costs 6,227 request chars, no classifier request, no charge, no wait.

## Decision Outcome

Chosen: route A. The probe judge matched 10 of 14 calls and cost about 5,000 characters, 1,725 billed tokens, and 3.5 s per ask, against 0 for stock. On 30 cases A scored 30 of 30 (507,958 tokens, $0.1899 on the 18 new cases) and B scored 29 of 30 (32,113 tokens, $0.0024 on the same 18); B fails `push-unnamed-branch` in 4 of 4 runs. A costs about 78 times more. The user preferred B if it tied, so B did not tie.

Same decision, other record: no judge Mod; claudetto ships no `tool.check` judge (task 5.28).

## Consequences

- claudetto ships no `tool.check` hook that reads `autoMode`; route B was built, measured, and deleted with its tests, option, and docs.
- B's Jev leg was tested only against a fake Jev. To override, rebuild B from the ISSUES section.

The 63,413-char local classifier text stays untrimmed on gateways.

Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:147; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:149-150; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3080; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3032; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3060.
