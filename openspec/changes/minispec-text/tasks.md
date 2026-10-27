## 1. Line Cap

- [ ] 1.1 Add the 300-line WARNING to `domain/validate.ts`, with the archive skipped. Check: tests for "Long Research File" and "Archived File" fail before the change, then `bun test tests/claudetto/spec/`.
- [ ] 1.2 Split the 4 files over 300 lines in `openspec/changes/redesign-0-4-0/research/` by topic, and fix each link to them. Check: `plugins/claudetto/bin/minispec validate --all --strict`.

## 2. Skill and Agent Text

- [ ] 2.1 Rewrite the minispec skills and the agents that use minispec for the Claude 5.5 models, from `.claude/claudetto/research/skill-writing-2026-10-26.md`: the concise-writing rule with its reason, no ALL CAPS, and each description as what it does, then "Use when". Check: `just check`.

## 3. Close

- [ ] 3.1 Add the entries to the `0.4.0-alpha.1` section of `CHANGELOG.md`, and get a `claudetto:Reviewer` review of the diff against this plan. Check: `just check`, and the review lists no open defect.
