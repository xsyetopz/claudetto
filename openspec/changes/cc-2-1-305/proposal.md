# Proposal: cc-2-1-305

## Why

The user said "2.1.305 is out, so claudetto 0.2.0 goes 2.1.305 minimum" (2026-10-21).
The tags `*--v0.2.0` are on `origin`, and they pin 2.1.304.
The user chose to move the six tags of 0.2.0 to the commit of this change, and not to ship 0.2.1 (2026-10-21).

## What Changes

- Study 2.1.305 with the method of `external/cc-diff-302-303/method.md`, and write `external/cc-2.1.305/` and `external/cc-diff-304-305/`.
- Check each engine fact that claudetto relies on (the probes, the d.ts, the hook fields, the settings keys, and the facts of `.claude/rules/engine-facts.md`).
- Move each pin and each version comment to 2.1.305: `tools/limits.ts` `MIN_CLAUDE_CODE_VERSION`, `.github/workflows/ci.yml`, `tools/builtins.ts`, `src/kernel/`, the adapters, the schemas, the issue templates, `README.md`, and the wiki.
- The evidence of the evals stays on 2.1.304, because each run names its version.
- Move the six tags `*--v0.2.0` to the new commit, and push them, after a yes of the user.
