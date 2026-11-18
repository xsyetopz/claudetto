---
status: accepted
date: 2026-11-17
---
# No Regex Stop Check

## Context and Problem Statement

An opener Stop check judged a reply's first sentence by a word list or regex.

The agent proposed a Stop hook that blocks a reply opening with agreement (SA-3.3). Should claudetto match words?

Should a Stop check catch an offer in prose such as "I can also write the test"?

The answer-first gate (its `kind` question, `PIN_ANSWER_FIRST`, lookup list, batch state, kind reset at compact, 17 lab tests) gave 132 denials with 8+ false. one check read only the latest message, so a mid-turn remark turned off the turn's work; one check read "Now it's active" as a remark. A planted evasion passed word-list/regex style checks 10 of 12 times.

Gates raised false path notices on grep patterns and asked the user to approve calls after a gate timeout. The user asks that the fault report carry probed solutions that use no word regex and no implementation prose, and calls brittle solutions a ToS violation.

Should a Stop hook judge the final reply for faults (credited, fallback, deferred, unchecked, unfixed, unfiled, options, unseen) or check open items?

Transcript record tx-x02/no-regex-stop-check: A Stop check for the reply opener would match words by regex; such solutions never work properly and are fragile.

## Considered Options

- Keep the check.
- Drop it.
- A Stop hook that matches agreement words.
- No word-match check; mitigate by prompt and output style, found by trial.
- A check on words in the reply.
- No check.
- Keep the answer-first gate
- Keep word-list/regex style checks (`AGREES` opener, padding fault)
- Remove both; judge style by typed questions (see the style-faults requirement)
- Match words in command text or in model replies.
- Decide from structured tool arguments and probed facts.
- Keep the Haiku claim-check grader and the open-items check at `classic.Stop`.
- Carry no Stop check; the reply form is stated positively in the output style.
- Regex or word-list opener Stop check.

## Decision Outcome

Chosen: dropped. A word list or regex judge is fragile (user decision, 2026-11-16).

No word-match Stop check: it is word-regex prose, fragile, and not language-agnostic. The user rejected the earlier padding check too. Decided by trial and error. Matches the settled decision of no regex Stop check.

Same decision, other record: no check. No structural signal separates "I can also write the test" from a statement of fact: no list marker, no checkbox, no terminal `?`. Any check would match words, and a word list is a keyword regex over prose. `open-items.ts` holds the one structural signal there is, a last line ending in `?`; the test `a question in the middle of the reply is no offer` records that a mid-reply `?` is often quoted or rhetorical. Decided only by a measured false-positive rate over recorded replies (inferred).

Same decision, other record: remove both. Wording-tests check (no denial in 7 days, only the subagent's own grep; measured) goes too. The settled decision "no regex Stop check" agrees.

claudetto decides from structured tool arguments and probed facts. It uses no word regex and no implementation prose. Each fix is found by a probe.

Same decision, other record: no regex Stop check and no Stop claim grader. The 2.1.325 design lists only `classic.StopFailure` and `classic.SessionStart` at the end of a session.

## Consequences

The cure for an agreeing or apologising opener has no regex Stop check; see the conduct risk in `risk-register.md`.

The agreement opener needs another cure (see the reply risk).

Agrees with the settled decision "no regex Stop check" (user decision, 2026-11-16). Basis: cited; the decision is read from the handoff that records it.

Good: no false denials of remarks. Bad: no deterministic opener test; `AGREES` was kept as an anchored test in the 321 decisions and the user later ruled out word lists (superseded, see `[ADR-0121](0121-agrees-anchored-opener-test.md)`).

The path scan, the request check, and any model-reply parse need a structural cure. This matches the settled decision of no regex Stop check.

- The old grader design is kept as a superseded record.
- Open items name their blocker through reply rules, not a Stop check.

Transcript record tx-x02/no-regex-stop-check decided: drop it.

Source: user decision, 2026-11-16 (User Answers); user decision, 2026-11-10 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/aea6b517-d507-41e2-9f42-d229baaf5384.jsonl:1936); openspec/changes/archive/2026-11-09-release-2-1-319/design.md:308; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:420; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:424; openspec/changes/archive/2026-11-13-feat-2-1-321/tasks.md:88; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:116; openspec/changes/archive/2026-11-16-2-1-323/design.md:214; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6612 (user decision, 2026-11-13); openspec/changes/2-1-325-rearchitecture/design.md:45; user decision, recorded in the 2026-11-17 handover (day of decision not recorded); user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5807); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6352.
