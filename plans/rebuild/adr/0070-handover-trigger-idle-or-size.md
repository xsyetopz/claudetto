---
status: accepted
date: 2026-11-16 (date of the handoff that records it; day of decision not recorded)
---
# Hand Over On An Idle Gap Or Context Size, Never On Age

## Context and Problem Statement

Platform docs, prompt-caching page, "How prompt caching works": the cache is refreshed for no additional cost each time the cached content is used, and its lifetime runs from the start of each request. Session age does not cool the cache; an idle gap of the TTL or longer does.

## Considered Options

- Session age of 59 minutes.
- An idle gap of about 59 minutes since the last request start, or a context-size threshold.

## Decision Outcome

Chosen: idle gap or context size. Supersedes `[ADR-0160](0160-session-age-handoff.md)`.

## Consequences

The agent chose this from the docs; the handover summaries say the user was still to be told. `handoff.ts:67-83` (age since session start) is a recorded defect.

Source: cited, platform docs prompt-caching page (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5807); observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6352).
