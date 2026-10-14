---
schema: dotclaude-spec/2
kind: package
id: P61
title: Status line palette
wave: 3
deps: ["P96","P122","P107","P133"]
owns: ["src/kernel/light.ts","tests/kernel/light.test.ts","src/plugins/dotclaude/slices/statusline/","tests/dotclaude/statusline/"]
satisfies: ["REQ-7","REQ-26"]
verify: just test tests/dotclaude/statusline && just lab
agent: implementer
status: planned
---

## Goal

Each item kind of the status line has one color role from one palette.
Identity items have stable, distinct hues, and green, yellow, and red mean health only.

## Context

- `statusline/color.ts`, `segments.ts`, `limits.ts`, and `adapters/subagents.ts`.
- Today, green means ahead, reserve, or added, and red means behind, removed, or run-out.
  Branch, folder, task name, and counter have no color of their own.
- The tests: `tests/dotclaude/statusline/color.test.ts`, `projected-color.test.ts`, and `render.test.ts`.
- The no-color mode of 1.0.0 stays (`change.md` of 1.0.0).

## Steps

1. Read the four files and list each item and its color today.
2. Put one palette in `color.ts`: a map from item kind to a role and an SGR code.
   Identity kinds, such as folder, branch, model, task, agent counter, and version, get hues that are not green, yellow, or red.
   State kinds, such as usage percent, pace, run-out, and lines added or removed, get green, yellow, or red by health.
3. Add `src/kernel/light.ts`: the gauge of REQ-26 (the step of room left from 10 to 0), the six lights in order, the light of a value against the marks of a signal, and the blink of the last step of a band or of a downward trend.
   State kinds take their color from the light, and the `percent` and `projected` styles of `color.ts` become lights.
4. Find out in `just sandbox` whether the status line of Claude Code renders the SGR blink code (5).
   If it does, a blinking light uses it.
   If it does not, a blinking light adds a marker next to the value, such as the pace arrow, and the evidence file gives the result.
5. Change each segment to take its color from the palette, and remove each other color literal.
   Each state item shows its step and its light, such as `▮4` in yellow.
6. Tests: the SGR code of each kind, no identity hue that equals a health hue, no two identity kinds with one hue, the step and the light of each value at and next to each mark, and the no-color mode with no SGR code.

## Acceptance

- `just test tests/dotclaude/statusline` and `just lab` pass.
- A search finds SGR literals only in `color.ts`.

## Boundaries

- Do not add a progress bar.
- Do not change the layout or the width rules.
