---
status: proposed
date: 2026-11-25
---

# Decisions Go to Jev First, With a Haiku Fallback

## Context and Problem Statement

Plugin decisions were made by whichever model was nearest: a forked Claude turn for the "You should know" recheck, and none at all for how a prompt should be read. TypeSafe Jev is a decision model, not a language model: it rates a statement about some state with a probability (a Noul, 0 to 1), answers in 147 to 220 ms warm, and costs $0.042 per million input tokens. Which model makes a plugin's decisions, and what happens when it is unavailable?

## Considered Options

- Keep decisions on forked or sampled Claude turns.
- Jev first, code decides from its ratings; Haiku 5.5 at high effort answers the same statements only when Jev fails.
- A Jev hook on every gated tool call (the shape ADR-0144 rejected).

## Decision Outcome

Chosen: Jev first, with one client and one fallback per plugin.

- A decision is a set of statements about some state. Jev rates each; code applies a truth table. A Noul at or above 0.7 is yes, at or below 0.3 is no, and between is unsettled. Only a yes acts; an unsettled rating never changes the outcome.
- A failed Jev call (no reply, no answer in 2,500 ms, a non-2xx status, a body that is not a rating from 0 to 1 for every statement) is an error, never a no. It routes to `$.model.complete` on Haiku 5.5 at high effort, which rates the same statements and returns the same typed answer. The fallback is not a second opinion: it is asked only after Jev failed.
- When both fail, the site keeps its existing fail-open behavior.
- The key is the environment variable `TYPESAFE_API_KEY`, read through `$.env.get`. Without it a decision step is off and no text leaves the machine. The model and effort of the fallback are the `deciderModel` and `deciderEffort` settings of `claudetto`.
- Each plugin holds its own copy of the client (`plugins/claudetto/hooks/prompt/judge.ts`, `plugins/claudetto-you-should-know/hooks/judge/judge.ts`), because the plugins ship separately and the repo has no shared-code pattern between them.

Sites moved:

1. `claudetto` pre-decide on `prompt.submit`. It runs inside the existing secret-guard hook after the credential check, because the host allows one unmatched hook per event and a prompt holding a credential must be dropped before any text goes to a third party. Questions (all wording in `hooks/prompt/questions.ts`):
   - `asks_verdict_only`: the prompt asks whether an idea or a proposed change is good, or for an opinion on it, and does not ask for the change to be made. A yes adds a note: give the verdict first with the file or line that settles it, and edit nothing.
   - `states_checkable_fact`: the prompt states as settled a specific fact about the project that the files could contradict. A yes adds a note: check each fact against the files, and say so where they differ.
2. `claudetto-you-should-know` recheck (`verdictOn`). The statement `note_no_longer_holds` is rated against the shown note and the tail (3,000 characters) of the main agent's reply text since the note was shown. A yes drops the note; no, unsettled, and both services failing keep it.
3. `claudetto-you-should-know` `accept`. It holds no model judgment: it parses a proposed line, compares it to the seen lines by key, and checks that the offer is due. The fork that writes the note stays on `$.model.fork`, because writing a note is generation.

Not moved: `claudetto` `hooks/handover/writer.ts` (generation).

## Conflicts With Earlier Decisions

- ADR-0144 (a Jev hook rejected: 152-262 ms warm added to every gated call, 1,500 ms deadline, fail open). Superseded for prompt submission and the recheck, which are not gated tool calls and ran on a model call already. The cold call measured 203 ms here (2026-11-25), against 0.2-1.8 s then, and no step gates a tool call. A Jev hook on gated tool calls stays rejected.
- ADR-0137 (Decider: Haiku and Sonnet kept, the Noul replacement dropped at 22/40 against 32). Amended, not reversed. The Stop claim check keeps its Haiku and Sonnet grade. The user's decision that Jev decides first with a Haiku fallback and an env-only key applies to the new sites. The 0.7 and 0.3 thresholds are ADR-0137's starting values and are unmeasured on these questions.
- ADR-0053 (the agent decides in-scope choices; the user answers the rest through AskUserQuestion; supersedes "Jev settles product choices"). Amended. Jev here rates statements about the submitted text and code adds a note; it never picks a product choice for the person.
- ADR-0177 (a component ships only when it beats vanilla). This is the ship bar. The decision is `proposed` until the pre-decide eval shows the with-arm beats its baseline; the caller runs that eval.

## Consequences

- Good: a decision costs about 0.0002 USD and 150-220 ms, and the fallback keeps it answered when Jev is down.
- Bad: the prompt text, and the recheck's reply-text digest, go to a third party when the key is set. The digest can hold anything the agent printed; the secret guard checks the prompt, not the agent's reply.
- Bad: the recheck judges the note against the reply text only, not tool inputs or results, where the fork saw the whole session. Without a key the fork path is unchanged.
- Strongest counterargument: a 0.7 and 0.3 band on a probability from a model trained on other questions is a guess. In the probe, `states_checkable_fact` sat at 0.41 to 0.64 on four of twelve prompts, which the table reads as unsettled and so as no change.

Baseline for ADR-0177 (eval run 2026-11-25T18-02-37-282Z, model claude-haiku-5-5): with-arm 0.934 at about $0.62, vanilla 0.810 at $2.23. The weak with-arm cases are agreed-choice-holds 0.44, artifact-to-file 0.73, count-in-reply 0.79, wrong-design-pushback 0.80, dispute-checkable 0.85 and rename-across-files 0.85.

Verified: claude plugin test plugins/claudetto -> 435 pass, 0 fail; plugins/claudetto-you-should-know -> 177 pass, 0 fail; claude 2.1.329, 2026-11-25. The tests mock `http.fetch` and `model.complete` and cover a Jev answer, Jev down then the fallback, and both down.

Verified: live probe, 12 synthetic prompts, 2026-11-25. Jev jev-1.14.0: 203 ms cold, 147-220 ms warm (median 161 ms), 364-374 input tokens per call, 4,418 tokens in total, 0.000186 USD. Haiku 5.5 at high effort through `claude -p`, 3 runs: 1.5-2.3 s API time, 3.1-4.1 s wall, 0.00014-0.00084 USD (the first run wrote the CLI's cache). `$.model.complete` itself was not timed live.

Source: user decision, 2026-11-25 (every decision in the plugins goes to Jev first, with Haiku 5.5 high as fallback only when Jev is unavailable).
