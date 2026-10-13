---
schema: dotclaude-spec/2
kind: package
id: P37
title: Destructive floor
wave: 3
deps: ["P25","P35"]
owns: [".dotclaude/spec/changes/1.0.0/evidence/destructive-floor.md","src/kernel/policy/","tests/kernel/policy.test.ts","src/plugins/dotclaude/slices/setup/domain/automode.ts","src/plugins/dotclaude/slices/prompt/texts.ts/tools.md","tests/dotclaude/setup/floor.test.ts","tests/dotclaude/setup/settings.test.ts"]
satisfies: []
verify: just check
agent: implementer
status: done
---

# P37 Destructive floor

## Goal

The user narrows the native auto mode classifier, permission system, and sandbox, in the way of macOS.
Normal work passes with no prompt, risky but recoverable work asks the user, and each destructive action is forbidden, also when the user asks for it.
The user can still run such a command with a `!` command.

## Context

- The decision of the user: `.dotclaude/spec/changes/1.0.0/change.md`, decisions, 2026-10-12 and 2026-10-13.
- The docs fact: `autoMode` has `environment`, `allow`, `soft_deny`, and `hard_deny`, and a list without `$defaults` replaces the built-in list.
  `hard_deny` blocks unconditionally.
  The classifier reads `autoMode` only from the user settings, so setup writes the block to the user scope only.
- The `environment` entry of P25 is `["$defaults"]` now.
  P25 moved its worktree and temp-folder entries to `allow` in `b77edda9` and `57cc0319`.
- The catalog is in the kernel, `src/kernel/policy/`, because the `setup` and `guard` slices cannot import each other.
  Each rule has an `id`, a `tier` (`floor` goes to `hard_deny`, `ask` goes to `soft_deny`, and `subagent` goes to `hard_deny` for a subagent only), a `category`, and `prose`.
- A stopped action is not retried another way.
  The agent stops and asks the user to run the exact command with a `!` command, then waits.
  A subagent stops and puts the exact command in its report.
  The shared prompt section `tools.md` holds this rule.

## Steps

1. Keep the rules in the files of `src/kernel/policy/rules/`, one file for each category.
   Setup reads them through `wantedLists` in `domain/automode.ts`, and holds no rule.
2. The setup block: `hard_deny` and `soft_deny` start with `$defaults`, and the user entries stay.
   Setup shows each changed list in the dry run, and it writes only with `--apply`, as P25 does.
3. Tests: `tests/kernel/policy.test.ts` checks the ids, the tiers, and the prose.
   `tests/dotclaude/setup/floor.test.ts` checks the written lists, a declined block, and a second run.
4. Run `claude auto-mode critique` on the new block, with a temp settings file, and write the output to the evidence file.

### Extension

- A new category: add `src/kernel/policy/rules/<category>.ts` that exports a `readonly PolicyRule[]`.
- Then add one line to `src/kernel/policy/index.ts`, which spreads the new list into `POLICY_RULES`.
- A new rule: add one entry to the file of its category, with a unique `id`, a `tier`, and `prose`.
  A forbidden rule ends its prose with `withAnyRoute`, which adds the wrapper clause.
- Run `just generate` and `just test tests/kernel/policy.test.ts tests/dotclaude/setup`.

## Acceptance

- `just check` passes.
- The setup block holds one entry for each catalog rule of each tier, after `$defaults`.
- `claude auto-mode critique` runs on the block, or the evidence file says why it cannot.

## Boundaries

- Write no list of rules in the `setup` slice.
- Change no `guard` file, and no `events.jsonl` line by hand.
- Use arrow functions, and add no legacy shim and no fallback.
