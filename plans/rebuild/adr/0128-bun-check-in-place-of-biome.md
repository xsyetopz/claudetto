---
status: accepted
date: recorded in openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:10 (day of decision not recorded)
---

# Bun check in place of biome

## Context and Problem Statement

The owner removed Biome and every trace (config, lint step, ignores, formatter settings, caches) with a `bun check` type check in its place; `noFunctionDeclaration.grit` went with it. Project CLAUDE.md still lists `bun run lint` and `bun fmt`; bedrock configs own lint. The own `claudekit` copy (fake Messages API, launcher, probe corpus) left the repo, evidence under `evidence/`, fixture grader under a user path not `/tmp`.

## Considered Options

* Keep Biome lint and format
* `bun check` type check only

## Decision Outcome

Chosen: `bun check` in place of Biome (owner decision).

## Consequences

Conflict open: project CLAUDE.md names `bun run lint` and `bun fmt`.

Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:10; unresolved: the Biome removal decision line was not found in the 2.1.319 tasks by grep in this pass.
