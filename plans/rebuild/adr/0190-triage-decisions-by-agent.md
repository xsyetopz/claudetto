---
status: accepted
date: 2026-11-18
---
# Triage Choices Settled by the Rebuild Agent

## Context and Problem Statement

The block triage of 2026-11-18 left choices that the plan text did not settle. The user delegated these choices to the rebuild agent. Each choice below is the agent's decision under [ADR-0177](0177-pragmatism-gate.md) and the product rules, not a user statement, and a later user decision overrides it.

A "measured check" under ADR-0177 is one recorded comparison against vanilla 2.1.327 on the item's own trigger: request bytes or a stub probe where the gain is structural, and a short paid run on the fault prompt where the gain is behavioural. A benchmark harness or suite is not built.

## Decision Outcome

Root prompt and conduct:
- Conduct text ships as one plugin output style with `keep-coding-instructions: true`, appended to the vanilla prompt. The per-model root prompt through `prompt.compose` moves to scope Out (REQ-REPLY-032, 036, 041, 051, 113, 114, 115, 117), because replacing the prefix drops vanilla rules and carries a cache risk per model.
- A conduct line ships only with a measured gain (kernel Q1 option b). The reply, kernel and verification CONDUCT cures fold into that one style.
- REQ-REPLY-024 and 029 become one style line, "answer a question before any tool call", measured; no classifier gate.
- REQ-REPLY-053 wins over 106, with 106's owner-action list kept.
- `/reply` (REQ-REPLY-044) moves Out: convenience with no measure.
- The 48 reply risks moved Out as unreproduced third-party reports stay Out.

Delegation and handover:
- The lead does not delegate by default (REQ-DELEGATION-049): the paid lab run measured a delegated lookup as slower and dearer.
- Metis (REQ-DELEGATION-044) moves Out under the no-planner rule; Artemis, Athena and Heracles remain.
- REQ-HANDOVER-053 wins: no model switch, so the ADR-0100 Haiku switch is void, because a switch breaks the prompt cache.
- The StopFailure notice (REQ-KERNEL-003) stays in kernel, after a code search confirms vanilla lacks it.

Guards:
- Memory: the pre-call free-memory hold only; no per-process watcher.
- The 6-hour process reaper (REQ-GUARDS-022) moves Out; ADR-0185 names no reaper.
- Worktree removal requires remote reachability (ADR-0185).
- Betterleaks does not ship; the deny rules of REQ-GUARDS-001 carry the cure, and RISK-117 closes.
- MCP size: `web_fetch` returns a path and a 2 KB outline; other tools rely on the ADR-0179 spill.
- RISK-079 is accepted and left to REQ-SETUP-065.
- The 13 risks whose cause lies outside claudetto close as out of scope, each naming its owner.

Cost and setup:
- No usage guard (REQ-COST-001 Out); the status line stays minimal (REQ-COST-004 option a).
- No transcript cost report (REQ-COST-014, 031, 032, 044, 045, 046, 049 Out); REQ-COST-040 keeps the cache-hit check.
- RISK-381 and 382 are accepted with no code (Likelihood 1, server-side causes).
- Settings reach the user by a silent fill-write of unset keys at SessionStart with one notice; no wizard.
- Auto memory is not written; REQ-GUARDS-048 requires consent.
- No `autoMode` lists and no `defaultMode` write: classifier accuracy with replaced lists is unmeasured.
- No model or effort values: vanilla already resolves the aliases to the 5.5 ids.

Verification:
- Arrange-Act-Assert applies to this repository's tests; no shipped test rule (REQ-VERIFICATION-082).
- The 12 plan-authoring risks close with the plan, because no plugin part carries them.

You should know:
- The check runs first at step 3, then every 6th step (REQ-YOU-SHOULD-KNOW-061), because notes reported as late need an earlier first look.
- REQ-YOU-SHOULD-KNOW-062 returns to scope In: the user's 2026-11-19 ruling lifts the byte-parity reason that moved it Out.
- Licence: every model-facing text and the description are claudetto's own since commit 8086a35e4. The user-facing strings (four toasts, the About card in `copy.ts`, button labels) keep the builtin's wording because the port recreates its UI/UX, and they need no licence: each is a label or a sentence of at most 17 words, matching the 2.1.327 builtin byte for byte (`chunk-nvx1z6pc.js:16675`), and the U.S. Copyright Office states that "words and short phrases … are uncopyrightable because they contain an insufficient amount of authorship" (Circular 33, page 2, read 2026-11-19). A longer builtin text that a port would copy is rewritten in claudetto’s own words instead.

Prompt text:
- Every model-facing text claudetto writes (prompts, tool and skill descriptions, hook reasons, notes the model reads) states what to do, with the reason, because Anthropic's prompting guide (platform.claude.com, "Prompting best practices", "Tell Claude what to do instead of what not to do" and "Add context to improve performance", read 2026-11-19) reports that positive instructions with a reason steer better than prohibitions. A named failure to avoid stays only when the guide for that model calls for naming it.
- Texts ported from a 2.1.327 builtin follow the same rule. The user ruled on 2026-11-19 that a port recreates the builtin's behaviour and UI/UX only: what the user sees keeps its form and wording, while its prompts, notes the model reads and descriptions are rewritten to claudetto's needs, because owning the full source is what lets claudetto optimise and fix them. Byte parity with the builtin text is not a goal.
- XML tags in texts claudetto writes use snake_case, because Anthropic's prompting guide uses that case for every tag (`<default_to_action>`, `<investigate_before_answering>`). The kebab-case wrappers such as `system-reminder` belong to Claude Code's harness and stay as Claude Code writes them.

## Consequences

- Items moved Out by this record go to `prd/README.md` scope Out citing ADR-0190.
- Open risks covered by the output style stay open until a dogfood session shows the fault absent.

Source: rebuild agent decision, 2026-11-18, session 5ec39a40-e3d5-4f0b-a8ac-97f52d27fa0f, from the triage question files; the user delegated these choices in the same session.
