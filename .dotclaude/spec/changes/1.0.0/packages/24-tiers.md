---
schema: dotclaude-spec/2
kind: package
id: P24
title: `tiers`
wave: 3
deps: ["P09"]
owns: ["src/plugins/dotclaude/slices/setup/domain/facts.ts","tests/dotclaude/setup/tiers.test.ts"]
satisfies: []
verify: just test tests/dotclaude/setup && just lab
agent: implementer
status: done
---

# P24 `tiers`

## Goal

The setup reads the account type and scales from Pro as the baseline, with the same features for each account.
Pro is the baseline.
Max 5x and Max 20x get more parallel agents and better model and effort picks.
An API key account gets the picks of its own budget.

## Context

- The entry: `.dotclaude/spec/changes/1.0.0/packages.md:126-132`, and the evidence: `.dotclaude/spec/changes/1.0.0/evidence/tiers.md`.
- The setup reads `claude auth status --json` for `subscriptionType`.
  It reads the rate limit tier only where Claude Code exposes it without the credentials file.
- The setup does not scale what Claude Code scales itself (`.dotclaude/spec/changes/1.0.0/evidence/tiers.md`).
- The tier code is in `src/plugins/dotclaude/slices/setup/domain/facts.ts`, which names the account type.
- The rules of the wave: `.dotclaude/spec/changes/1.0.0/packages.md:7-15`.
- Before a check, run `bun install` in the worktree, and copy each git-ignored types folder of the main checkout `/Users/krystian/CodeProjects/xsyetopz/dotclaude`.

## Steps

1. Change the tier parts of `domain/facts.ts` to read `subscriptionType` from `claude auth status --json`.
2. Scale the parallel agents and the model and effort picks by the account type, with Pro as the baseline.
3. Write `tests/dotclaude/setup/tiers.test.ts` with a fake `claude auth status` output for each account type.
4. Run `just generate`, `just test tests/dotclaude/setup`, and `just lab`.

## Acceptance

- `just test tests/dotclaude/setup` and `just lab` pass.
- Each account type has one test with a fake `claude auth status` output.
- The features are the same for each account type.

## Boundaries

- Change only the paths of `owns`.
- Write each text that goes to Claude in strict ASD-STE100.
- Use arrow functions, and add no legacy shim and no fallback for an old layout.
