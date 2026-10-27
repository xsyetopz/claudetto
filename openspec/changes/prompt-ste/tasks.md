## 1. Research

- [ ] 1.1 Write `.claude/claudetto/research/prompt-practices-2026-10-27.md` with the prompt practices of Anthropic for each current model, each with its source URL. Check: each rule of the file names a source.

## 2. Rewrite

- [ ] 2.1 Rewrite `agents/*.md` and `output-styles/Concise.md` of `plugins/claudetto/`. Check: `just check`.
- [ ] 2.2 Rewrite each `skills/*/SKILL.md`, `description.md`, and the spec templates of both plugins. Check: `just check`.
- [ ] 2.3 Rewrite each `prompts.ts` and each `tool.describe` text of both plugins, and the lab tests that match them. Check: `just check`.

## 3. Proof

- [ ] 3.1 Add the entry to the `[0.4.0-alpha.2]` section of `CHANGELOG.md`, and get a `claudetto:Athena` review of the diff for lost facts and hedges. Check: `just check`, and the review lists no open defect.
- [ ] 3.2 Ask the user to approve a paid eval of the rewritten prompts, with its cost and the weekly share. Check: `just eval-stats`.
