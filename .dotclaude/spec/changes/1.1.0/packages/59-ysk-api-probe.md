---
schema: dotclaude-spec/2
kind: package
id: P59
title: you-should-know: mod API probe (done by evidence)
wave: 1
deps: []
owns: [".dotclaude/spec/changes/1.1.0/evidence/ysk-api.md"]
satisfies: ["REQ-8"]
verify: test -s .dotclaude/spec/changes/1.1.0/evidence/ysk-api.md && bun run lint:md
agent: main session
status: verified
---

## Goal

The evidence file `.dotclaude/spec/changes/1.1.0/evidence/ysk-api.md` records the probe of 2026-10-14: which parts of the built-in UX a third-party `hooks/register.ts` can copy, and each gap.

## Context

- The probe confirmed that a third-party `hooks/register.ts` can use `turn.step` (an async generator), `$.model.fork` (no tools enforced), `ui.render` on `AbovePrompt`, `Button.hotkey`, the theme color `suggestion`, `prompt.fill`, `prompt.submit`, `clock.after`, `$.store`, and `session.end`.
- Only `$.telemetry` is built-in only, so the plugin uses `$.ui.log`.
- `AbovePrompt` is raised on the terminal and the desktop only, so no band is expected on mobile and in vscode.
- The built-in UX of 2.1.296, with the bundle lines in `$TMPDIR/ysk2/all.txt` near 351778, 351817, and 351818: a check at step 0 and each 6th step, the header `✦ You should know ·`, the rows and buttons, the feedback row with a timeout of 20,000 ms, and the caps.
- The types file `plugins/dotclaude/.claude-plugin/types/claude-code/index.d.ts`: `$.model.fork` (2640, 6369), `$.prompt.fill` (2977, 8618), the `AbovePrompt` band (4050), and `$.clock.after` (7141).

## Steps

1. Write a table: each UX element, the API, the bundle or types line, and `copy`, `near copy`, or `gap` with the reason.
2. Write the probe method and the date.

## Acceptance

- Each UX element of the context has a row with its line.
- `bun run lint:md` passes.

## Boundaries

- Read the bundle for evidence only, and patch nothing.
- Do not copy bundle code into the evidence file beyond a short quote of a label.
