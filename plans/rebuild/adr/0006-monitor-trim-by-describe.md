---
status: superseded by ADR-0031
date: 2026-11-04
---

# Cut Monitor through tool.describe

## Context and Problem Statement

Monitor loaded through ToolSearch is the largest tool (description 6,354 plus schema 1,040 chars). How is it cut?

## Considered Options

- Cut the text with a `tool.describe` hook.
- Replace it.

## Decision Outcome

Chosen (2026-11-04): cut Monitor through `tool.describe`. A `tool.describe` hook cannot cut the schema (6,354 to 14 chars; 1,040 stays), so the user replaced this choice on 2026-11-05.

## Consequences

Superseded.

Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2046; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1999; user decision, 2026-11-04.
