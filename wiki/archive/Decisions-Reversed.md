# Decisions-Reversed

The decisions of 0.x that 1.0.0 reverses, with the reason for each reversal.
The decisions in force are in [Decisions](Decisions).

## Settings

None yet.

## Prompt

None yet.

## Router

None yet.

## Tools

None yet.

## Layout

- D19 Runtimes.
  Old choice: runtime JavaScript is `.mjs` on Node.js 22.18 or later, and tests and `tools/` run on Node.js with no Bun.
  Reason: 1.0.0 code is `.ts` with erasable syntax, the bins of the add-ons run on Bun, and the setup step checks Bun 1.4.3.
  Source: `CHANGELOG.md`, the `[Unreleased]` section, `package.json` `engines`, and `tests/support/runtimes.test.ts`.
- D21 Hand-off order.
  Old choice: the 0.28.0 plan ended in a hand-off, with a preparation group that ran a live patch of settings before the 0.28.0 work.
  Reason: 1.0.0 discards the 0.28.0 plan.
  Source: `.dotclaude/spec/changes/1.0.0/change.md`, "Decisions of the user", the first item.

## Evidence

None yet.
