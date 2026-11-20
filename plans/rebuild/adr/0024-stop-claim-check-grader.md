---
status: superseded by ADR-0104
date: 2026-11-09
---
# Stop Claim-Check Grader

## Context and Problem Statement

At `classic.Stop`, after named-files and open-items checks, ask Haiku which offered faults the final reply holds.

## Considered Options

- A Haiku grader returning `{"faults":[{"code","quote"}]}`.
- A wider word list for the open-items check (rejected: each word is one more escape; planted evasion passed word lists 10 of 12 times, reported dossiers).

## Decision Outcome

Chosen then: block once with each found fault's fix; never block when `stop_hook_active` is set or the call fails; a finding counts only if its code was offered this turn and its quote is a substring of the reply. Input: the final reply, the last 30 person messages, and the last 6 assistant messages. Codes: `credited`, `fallback`, `deferred`, `unchecked`, `rules`, `unfixed`, `unfiled`, `options`, `unseen`; no `padding` fault. A blocker counts only when the hook can check it: a `! <command>` step, a permission denial in this turn's tool results from `$.session.messages()`, or an open `AskUserQuestion`; an open item is a Markdown `- [ ]` in the final reply; an offer is a last line ending `?`; the gate records its own denials by `tool_use_id`. Superseded by the settled rule of no Stop check.

## Consequences

- Missing at 088a227c: `stop_hook_active` is in no file under plugins/.

Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:323; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:103.
