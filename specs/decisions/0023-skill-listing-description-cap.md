---
status: accepted
date: 2026-11-09
---

# Cap Skill Listing Descriptions at 200 Characters

## Context and Problem Statement

Claude Code cuts a skill description in the listing silently when it passes skillListingMaxDescChars. Which cap does claudetto set, and how does it keep descriptions inside it?

## Considered Options

- Set skillListingMaxDescChars to 200 in claudetto's settings, and add a claudetto frontmatter linter that warns, with agentskills.io name rules as warnings.
- Leave the default cap and accept silent cuts.
- Add lightweight skills that write subagents and skills, and output styles built first around ASD-STE100.

## Decision Outcome

Chosen option: skillListingMaxDescChars 200 in claudetto's settings (user decision, 2026-11-09). The cut is silent, so a claudetto frontmatter linter warns with the agentskills.io name rules. Lightweight skills that write subagents and skills and output styles built first around ASD-STE100 go with it.

## Consequences

- A description over 200 chars is warned about before Claude Code cuts it.
- The baseline already tests the value 200 (plugins/claudetto/hooks/features/surface/surface.test.ts:188@088a227c) and trims to 60 in trim.ts:24; the linter pairing is not in the baseline.

Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1002-1009; user decision, 2026-11-09 (settings review decisions C9 to C12).

Verified: 2026-11-26, claude 2.1.329, Haiku 5.5: the settings fill had drifted to 60 (hooks/settings/defaults.ts), which cut each skill's trigger; the spec skill loaded in 0 of 6 headless runs of a fresh feature request with claudetto and claudetto-spec, 3 of 6 with claudetto-spec alone. Back at 200: 4 of 6 (RISK-561); user decision through AskUserQuestion, 2026-11-26.
