---
status: accepted
date: 2026-11-10
---
# Read Pointed-At Files in Slices

## Context and Problem Statement

Reading each pointed-at file in full is bad for large files.

## Considered Options

- Read in full.
- Read the slices needed.

## Decision Outcome

Chosen: Read pointed-at files in slices for what the task needs. Supersedes [ADR-0028](0028-read-pointed-at-files-in-full.md).

## Consequences

The agent never claims a read it did not do.

Source: user decision, 2026-11-10 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/aea6b517-d507-41e2-9f42-d229baaf5384.jsonl:1757).
