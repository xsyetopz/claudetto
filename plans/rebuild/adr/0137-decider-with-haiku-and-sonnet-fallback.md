---
status: accepted
date: recorded in openspec/changes/archive/2026-11-09-release-2-1-319/design.md:281 (day of decision not recorded)
---
# Decider with Haiku and Sonnet Fallback

## Context and Problem Statement

The claim check at Stop sends the agent to look when a reply states the state of work and no call that turn looked at the workspace (a denied call is not a look). Haiku grades the `unchecked` fault; syc-fixed-total went 9/16 to 16/16 (p=0.0068; pooled 24/24 against 13/24). A Noul-based Decider replacement scored 22/40 held-out against 32 for Haiku plus Sonnet.

Which model makes claudetto's decisions?

Jev alone leaves some questions unsettled. Which of them get a model call? This supersedes decision 5 of the 2026-11-09 change.

Two drafts conflicted: one kept thresholds (pick if `probabilities[choice]` is at least 0.75; approval Noul P(yes) under 0.2 is no, at least 0.7 is yes, at most 0.3 is no; multi-select handed back) and a `typesafeApiKey` userConfig option; the later ones dropped both.

The Decider (Jev) needs a TypeSafe key. Routes: a `typesafeApiKey` userConfig option (keychain), a `settings.read` hook, or the env variable `TYPESAFE_API_KEY`. A `settings.read` hook changes 1 of 7 measured keys in `-p`; interactive adds `outputStyle`.

Transcript record tx-x01b/jev-for-routine-decisions: Who decides routine questions in the rebuild session?

Transcript record tx-x02/jev-fallback-haiku: The decider (Jev) needs a fallback model with a key in TYPESAFE_API_KEY.

## Considered Options

- Replace the Haiku and Sonnet grade with the Noul Decider.
- Keep the Haiku and Sonnet grade and the five-question Decider register check.
- LLM calls for every decision.
- The TypeSafe decider (Jev) where reliable, haiku-5-5[high] as fallback, model and effort configurable.
- Escalate every unsettled question.
- Escalate only a Noul between 0.7 and 0.3 at sites with `escalate: true`; other sets get "unsettled" with no model call.
- Never escalate.
- Keep thresholds and the `typesafeApiKey` option.
- Drop both and read `TYPESAFE_API_KEY` from env only.
- `typesafeApiKey` userConfig option in the keychain.
- `settings.read` hook as tier-key route, with a hook-site Jev call and `confidence` thresholding.
- `env.TYPESAFE_API_KEY` only.
- The root model.
- Jev through the `typesafe-ai` skill, with `claude-haiku-5-5` at high effort as fallback (`TYPESAFE_API_KEY`).
- No fallback.
- A configurable Haiku 5.5 high fallback.

## Decision Outcome

Chosen: keep Haiku plus Sonnet; drop the Noul replacement. The five-question register check (`apologizes_or_agrees`, `states_feeling_or_praise`, `repeats_person`, `names_own_mistake_without_result`, `steps_listed_as_report`, at 80% precision and recall; any yes blocks once) is kept; four held-out questions (`claim_without_shown_check`, `question_unanswered`, `doable_step_left`, `choice_handed_to_person`) never block. Rule: a site whose recorded check fails keeps its current code. The check must run at Stop (a next-prompt note comes after the commit message was used). It cures sycophancy, narration, and self-flagellation. Cost: Stop hook median 2.5 ms, Haiku call median 1.05 s over 133 calls, blocked turn +4.4 s and $0.012.

Jev decides what it can reliably decide; haiku-5-5[high] is the configurable fallback.

Same decision, other record: the second option. One fallback call covers only the escalating questions. Sites whose unsettled row asks the user (the branch gate) do not opt in. Cited Hightouch: Jev alone 89.1% on the hard set, 95.3% with escalation. Measured: 13.2% of claim-check Nouls fell in the band (174 of 1,318), and the fallback matched 45 exactly against 44 for unsettled.

Superseded (draft record; the dated user decision keeps a configurable Haiku fallback): drop thresholds and the option (the later drafts, D321 and its successors).

Also decided (environment only): env only. The Decider reads the environment; a project `.env` is not read (measured). The `settings.read` route, the hook-site call and the `confidence` thresholding go.

## Consequences

- `plugins/claudetto/hooks/kernel/decider/` exists at 088a227c (partial); the claim-check Stop block itself is missing.
- The claim check is a model grade and not a regex, so it does not conflict with "No regex Stop check".

Needs a TypeSafe key, asked in setup.

- Missing at 088a227c: `escalate` is in no file under plugins/.
- The tool exists only when the env key is set.
- Bad: the key moves from keychain to plain-text env. README should prefer the shell secret store.
- Good: one key source.

Transcript record tx-x01b/jev-for-routine-decisions decided: Jev for routine decisions with the Haiku fallback; the root model is `claude-opus-5-5` at medium effort. Good: cheap routine calls. Bad: a key is needed.

Transcript record tx-x02/jev-fallback-haiku decided: configurable Haiku 5.5 high. plugin.json already defaults deciderModel and deciderEffortLevel to it. The key lives in the settings env of the user.

Source: openspec/changes/archive/2026-11-09-release-2-1-319/design.md:281; openspec/specs/claim-check/spec.md:10; openspec/specs/claim-check/spec.md:169; plugins/claudetto/hooks/kernel/decider@088a227c. Basis: measured. Not located: the 22/40 line; user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:12); openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:186; openspec/specs/decide/spec.md:39; openspec/specs/decide/spec.md:53. Basis: reported. Not located: the draft lines holding the 0.75 threshold; openspec/changes/2-1-325-rearchitecture/specs/decide/spec.md:35; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:195; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 (goal text, Rules); user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded); user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:473); (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:1281).
