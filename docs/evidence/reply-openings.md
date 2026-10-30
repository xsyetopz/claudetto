# Reply-Opening Signal

Task 3.4 of `claudetto-restart` left the signal of the reply-opening rule open between a judge call
and a structural check. The reading below, taken on 2026-10-28, turns the structural check down. No
opening hook ships.

## Method

`bun claudekit/openings/reply.ts` reads the transcripts under `~/.claude/projects`. No model is called,
no file is written, and no text leaves the machine.

It takes the final visible text of each turn, which is the `answer` field of `turn.complete`
(`clawdipedia` route `extend/mod-api/types/turn-prompt/suggest-skill-turn`, `TurnCompleteFields`), and
applies the candidate signal of `claudekit/openings/evidence.ts` to its first sentence. The signal is
structural, because a word list is prose policing and a judge is a model call per reply: a first
sentence that holds no code span and no digit carries no evidence.

An earlier count of 3,146 replies with 35.6% flagged scored every text block of the assistant,
including mid-turn narration such as "Now the test:". `turn.complete` fires once per turn, so only
the last text of a turn reaches a hook.

| Corpus | Turn-final replies | Flagged | Share |
| --- | --- | --- | --- |
| 328 transcripts, 9 project folders | 968 | 74 | 7.6% |
| This repository's folder | 107 | 51 | 47.7% |
| `claude-code-docs` | 31 | 17 | 54.8% |
| Six probe folders, headless runs | 830 | 6 | 0.7% |

## The Flagged Openings

The 74 are classified by hand:

| Bucket | Count | Examples |
| --- | --- | --- |
| Outcome-first opening with no code item and no number | 66 | "Both edits are in and validated.", "The site is live.", "All green.", "Done." |
| Artifact of the sentence splitter, which read a Markdown heading as the sentence | 6 | "Outcome", "Archive Done" |
| The defect the rule targets | 2 | "Got it.", "Nothing to run, so here is the word you asked for: OK." |

The signal is 89% false positives, and the defect's base rate is 2 in 968. The second of the two came
from the removed `work.reply-opening` hook, which blocked a correct `OK.` and the forced rewrite
narrated the answer (`openspec/changes/claudetto-restart/references.md`, "Three Hooks Removed on
2026-10-27").

## Result

The rule stays in `output-styles/Concise.md`, which the harness re-injects on each user message at 102
characters. That is the third rung of the enforcement ladder of
`external/please-use-me-often/agent-failure-dossier/00-INDEX.md:43-51`, above prose and below a gate.

Each candidate and the figure against it:

| Candidate | Cost | Against it |
| --- | --- | --- |
| The structural signal as a note | None | 66 notes on correct replies for 2 padded ones |
| A judge at `turn.complete`, pre-filtered by the structural signal | A `claude-haiku-5-5` call on 1 reply in 13, every session | A base rate of 0.2% |
| A blocking hook | A model call per reply | Ruled out on 2026-10-27, "so these brittle hooks should not exist at all" |

## Limits

The result rests on a base rate, so another corpus can overturn it. `bun claudekit/openings/reply.ts
--sample 80` takes the reading again. Three cases where it is worth taking:

- A session set where padded openings are common, such as a model or a tier the style text does not
  reach. A flagged share whose hand count is mostly real padding flips the trade.
- A signal that reads something other than the first sentence's characters, and that a count on this
  corpus separates from correct replies.
- A reply rule with a free check of its own. "A piece is working only after its check ran" is `W5-10`
  and `I04`, and the archived `missingCheck` rule for it was removed for firing on prose files.
