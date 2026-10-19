# Proposal: cc-2-1-304

## Why

The user said "only on 2.1.304 now. plugin moves to 2.1.304" (2026-10-20).
Claude Code updated to 2.1.304 during the eval work, and the hard eval run of 2026-10-20 ran on it.
The plugin, the checks, and the evidence pin 2.1.303.

## What Changes

- Study 2.1.304 with the method of `external/cc-diff-302-303/method.md`, and write `external/cc-2.1.304/` and `external/cc-diff-303-304/`.
- Check each engine fact that claudetto relies on (the probes, the d.ts, the hook fields, the settings keys, and the facts of `.claude/rules/engine-facts.md`).
- Move each pin and each version comment to 2.1.304: `tools/limits.ts` `MIN_CLAUDE_CODE_VERSION`, `.github/workflows/ci.yml`, `tools/builtins.ts`, `src/kernel/`, the adapters, the schemas, the issue templates, and the wiki.
- From now on, each eval runs on 2.1.304 only.
