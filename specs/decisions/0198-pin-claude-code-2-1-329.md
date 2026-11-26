---
status: accepted
date: 2026-11-24
---

# Pin Verification to Claude Code 2.1.329

## Context and Problem Statement

ADR-0195 set 2.1.329 as the floor and let probes run on the installed 2.1.330 and 2.1.331. On 2026-11-24 the user's goal message limited the target to 2.1.329: the three plugins are built for it, not for 2.1.330 or later, and a Verified line on any other version no longer counts. The installed binary reads `2.1.329 (Claude Code)` (`claude --version`, 2026-11-24). Which version settles an acceptance check, and does the pin change the plugin manifests?

## Considered Options

- Keep ADR-0195: 2.1.329 floor, probes on any later version.
- Pin verification to 2.1.329 and keep the manifest floor `engines.claude-code: ">=2.1.329"`.
- Pin verification to 2.1.329 and set `engines.claude-code: "2.1.329"` in each manifest.

## Decision Outcome

Chosen: the second option. Every acceptance check, probe, eval and test run that settles an item runs on 2.1.329 and names that version in its Verified line. A Verified line on 2.1.327, 2.1.330 or 2.1.331 stays as history and settles nothing.

The manifests keep the floor. In 2.1.329 an `engines` range that excludes the running version stops the plugin from installing or loading (`"<name>" was not installed`, chunk-hg1yqkjk.js@4670755, cc-inspect code search `engines`, 2.1.329, 2026-11-24), so an exact pin would lock out every later version, which the goal does not ask for. Moving the manifest is reversible later.

## Consequences

- ADR-0195 is superseded.
- Work aimed at 2.1.330 or 2.1.331 is rechecked on 2.1.329 first. The plugin API types written into `.claude-plugin/types/` came from 2.1.331. Two tests (`hooks/pool/__tests__/offer.test.ts`, `hooks/web/__tests__/register.test.ts`) passed the 2.1.331-only `ToolOfferInput.for` field and failed the 2.1.329 type check; the field is dropped from those inputs, with the user's approval of 2026-11-24 through AskUserQuestion, and no assertion changes. Production code never reads `for`, and 2.1.329's `tool.offer` fires at list and at call as 2.1.331's does.
- The types under `.claude-plugin/types/` must be written by 2.1.329: `just project-typecheck` refuses any other version.

Source: the user's goal message, 2026-11-24; `claude --version` 2026-11-24; cc-inspect `code search engines`, 2.1.329, 2026-11-24.
