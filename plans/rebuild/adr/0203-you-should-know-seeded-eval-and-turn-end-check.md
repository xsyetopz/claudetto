---
status: accepted
date: 2026-11-26
---

# You-Should-Know Is Measured on Seeded Sessions and Checks at Turn End

## Context and Problem Statement

`claudetto-you-should-know` shows one note about a consequential thing the main agent did and did not mention. ADR-0177 ships a part only when a measured run beats vanilla. Vanilla 2.1.329 offers no equivalent on this account: the builtin `cc-plugin-you-should-know` registers with `defaultEnabled: false` behind an `isAvailable` gate that ends in the flag `tengu_jolly_dewdrop` (chunk-v2byvq1b.js, offset 16632 in the 2.1.329 build), and `/plugin enable` answers that it is not installed. So the baseline is no note at all, and the question is whether the plugin's notes are right often enough, and wrong rarely enough, to be worth their side requests.

The repo had no eval for that. A first live measurement scored 2 of 12 seeded positives. The cause was not the prompt: the plugin keeps `seen` (the recent offers) user-wide in its store (hooks/check/run.ts:59, :113), and passes it to the propose prompt under "Pick a different topic". Notes from earlier probe runs about the same topics suppressed the later runs. The builtin keeps the same key the same way.

## Considered Options

- Keep the shipped propose prompt and cadence (a check at step 3, then every sixth step).
- Rewrite the propose prompt (two iterations, plus a shorter "focus" variant).
- Add one check at the end of a main-agent turn that ran past its last check step with no note offered that turn.

## Decision Outcome

Chosen: keep the prompt and add the turn-end check (hooks/check/step.ts, REQ-YOU-SHOULD-KNOW-076). Replay A/B of the prompt variants on the same forked requests gave no gain over the shipped prompt (base 9/12 hits and 0/6 false alarms; iteration 2 9/12 and 1/6; focus 7/12 and 0/6), so both prompt rewrites were reverted. The misses that remained were a timing gap: in a short turn, the consequential command ran at step 4 or 5, after the only check at step 3, and the end of a turn only rechecked a note that was already up.

The eval lives in reports/2026-11-26-release/ysk-seeded: scripted main-agent steps run for real in a temp git repo, and only the plugin's side requests reach the model. Each run clears `seen` first. Three sets:

- `tune`: 4 positives, 2 negatives, the cases the prompt work used.
- `check`: 3 positives, 3 negatives, written before any tuning and scored once on the shipped plugin.
- `fresh`: 3 positives, 3 negatives, written after the check run that showed the timing gap, so the turn-end check was not shaped on them.

## Consequences

- Good: the notes now reach the end of short turns. Over all 18 cases, hits rose from 12 of 30 to 25 of 29, and false alarms fell from 2 of 24 to 1 of 24.
- Bad: side requests rose from 72 to 99 per 54 sessions, and their output tokens from 25,933 to 45,971.
- Bad: 6 of 165 fork replies across both arms had no text. Two of the 95 replies with the turn-end check, both at turn end, answered as the main agent ("A model fork cannot use tools") instead of as the observer. The parser shows nothing for either kind, so each costs a request and shows no wrong note.
- Bad: `seen` stays user-wide, as in the builtin. A note shown in one project can keep a later, real warning on the same topic from showing in another project.
- Strongest counterargument: n is 3 runs per case, and each case is one scripted session, so the copies are correlated. Two cases also measure the probe more than the plugin. In `force-push`, the user's deny rules refuse the push, and the note reports the unfinished push. In `secret-committed`, the scripted agent writes a stub `webhook.ts`, and two of three notes name that stub instead of the committed secret.

Verified: seeded A/B, claude 2.1.329, Haiku 5.5, 2026-11-26, `--permission-mode dontAsk`, 18 cases x 3 runs per arm, scored by `bun score.ts` with the plugin's own parser. HEAD (e0ba94bff): tune 9/12 hits, 0/6 false alarms; check 3/9, 2/9; fresh 0/9, 0/9. With the turn-end check: tune 8/12, 0/6; check 8/8, 1/9 (one run's prompt was never submitted); fresh 9/9, 0/9.

Verified: replay A/B, claude 2.1.329, 2026-11-26, the tune set, each propose request re-sent 3 times per prompt variant (proxy.ts YSK_VARIANTS, score-variants.ts): the numbers in Decision Outcome.

Verified: `claude plugin test plugins/claudetto-you-should-know`, claude 2.1.329, 2026-11-26: 119 pass, 0 fail. The turn-end test fails on the HEAD step.ts.

Source: ADR-0177; ADR-0190; REQ-YOU-SHOULD-KNOW-074; user decision through AskUserQuestion, 2026-11-26 (build a seeded eval first and decide on its hit and false-alarm rates).
