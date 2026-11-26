---
status: accepted
date: 2026-11-21
---
# Two Standards Bases: The Claude Code Harness and Open Industry Standards

## Context and Problem Statement

claudetto's plugins, plans and file formats have borrowed from many frameworks (OpenSpec, Spec Kit, Superpowers, Kiro, BMAD), each with its own vocabulary and layout. A borrowed convention that only one framework uses binds claudetto to that framework's churn and confuses users of the others. On 2026-11-21 the user named the two bases claudetto goes by.

## Considered Options

- Adopt one framework's conventions whole (OpenSpec or Spec Kit).
- Pick conventions case by case from any source.
- Two bases only: the Claude Code harness, and open, established industry standards.

## Decision Outcome

Chosen: two bases only.

1. **The Claude Code harness**, documented or observed by probe: plugin layout, hooks, `$.tool.register` tools, skills with Claude Code's extra frontmatter (`when_to_use`, `argument-hint`, `allowed-tools`, `context: fork`, `paths`), `claude plugin eval` cases, CLAUDE.md and `.claude/rules/`.
2. **Open, established standards**, each with a public specification and more than one adopter:
   - Agent Skills (agentskills.io): `SKILL.md` with `name` and `description`, optional `scripts/`, `references/`, `assets/`, one level deep. claudetto skills keep to the spec fields and add Claude Code fields only where the harness gives a gain the spec cannot.
   - ARCHITECTURE.md (architecture.md) for a project's architecture overview, and DESIGN.md (google-labs-code/design.md) for design tokens: the `spec` skill reads them when present and never creates them.
   - Gherkin's Given/When/Then for scenarios.
   - arc42, MADR, ISO/IEC/IEEE 29148 and ISO 31000 for `plans/`; Conventional Commits for history; AGENTS.md as the cross-agent instruction file.

A convention outside both bases, such as a framework's own folder layout, constitution file or command prefix, is not adopted; its idea may be, under a name and format from the two bases.

## Consequences

- `claudetto-spec` (ADR-0192) uses `specs/<capability>.md` with Gherkin lines, not OpenSpec's `openspec/` tree or SHALL keyword, and no Spec Kit constitution.
- A skill that loads on claude.ai or the Skills API keeps to the Agent Skills fields, since those surfaces reject unknown frontmatter.
- A new convention enters the plan with its standard named in the item's Source.

Source: user decision, 2026-11-21 (this session, 058ea2d3-793b-495e-912a-323a9453747d); <https://agentskills.io/specification>, <https://architecture.md/>, <https://github.com/google-labs-code/design.md> (read 2026-11-21).
