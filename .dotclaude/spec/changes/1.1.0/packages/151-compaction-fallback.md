---
schema: dotclaude-spec/2
kind: package
id: P151
title: Compaction as a fallback after the handoff (D1)
wave: 6
deps: ["P70","P90","P116"]
owns: ["the env block of src/plugins/dotclaude/slices/prompt/slice.ts","tests/dotclaude/prompt/compaction.test.ts",".dotclaude/spec/changes/1.1.0/evidence/compaction.md"]
satisfies: ["REQ-9"]
verify: just test tests/dotclaude/prompt && just lab
agent: implementer
status: planned
---

## Goal

Compaction is a last resort: it starts only above the hard bound of the handoff of P70, such as at 95%, and only when the handoff failed, as D1 says.

## Context

- `prompt/slice.ts:54,61,65,69`: `CLAUDE_CODE_AUTO_COMPACT_WINDOW: "300000"`, `CLAUDE_CODE_MAX_CONTEXT_TOKENS: "300000"`, `DISABLE_COMPACT: "1"`, and `autoCompactEnabled: false`.
- I03 recipe 1 (`01-grounding-and-memory.md:183`): a common setting is `autoCompactWindow` near 200k.
- The bounds of P70: `CONTEXT_PERCENT` and `HANDOFF_HARD_PERCENT` in `handoff/limits.ts`.

## Steps

1. Record the window of 300000 next to about 200k of recipe 1 in the evidence file.
   No step depends on that record.
2. Remove `DISABLE_COMPACT` and set `autoCompactEnabled: true`.
   Set the compaction start above `HANDOFF_HARD_PERCENT`, such as at 95% of the window, after the user names the value.
3. Change the `prompt.section` test of `context_management` to match.
4. Test `compaction.test.ts`: the env keys, and a compaction start above `HANDOFF_HARD_PERCENT`.

## Acceptance

- The verify command passes.
- The compaction start is above the hard bound of the handoff.

## Boundaries

- Compaction is not a fix of I03, and no acceptance criterion of 1.1.0 depends on it.
- Change the window only after the user names the value (REQ-16).
- Do not change the `sandbox` block.
