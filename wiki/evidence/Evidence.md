# Evidence

This page is the index of the evidence pages.
Read it to find the page and the source file of a measurement.
Each row gives what the page measures, its date, its Claude Code version, and its source file.
If a page does not state a date or a version, the row says "not stated".

## Measurement Pages

| Page | What it measures | Date | Claude Code version | Source file |
| --- | --- | --- | --- | --- |
| [Handoff Cost](Handoff-Cost) | The cost of one `/dotclaude:handoff` of dotclaude 1.0.0 and one `/compact`, from the same session | 2026-10-12 | `2.1.296` | `wiki/evidence/Handoff-Cost.md` |
| [Usage Evidence](Usage-Evidence) | The plans, the prices, the models, and the usage of claudetto 0.1.0, with one measured week of dotclaude 0.x | Measured week 2026-09-21 to 09-28, measures of 2026-10-03, prices of 2026-10-13 | `2.1.287` for one fact, otherwise not stated | `wiki/evidence/Usage-Evidence.md` |
| [Prompt Variants](Prompt-Variants) | The system prompt variant of each model family, the verification line of each subagent block, and the size bounds of the first request | Not stated | Not stated | `wiki/evidence/Prompt-Variants.md`, with the variants in `src/plugins/claudetto/slices/prompt/domain/variants.ts` |
| [Evals](Evals) | The suite of 16 cases, how to run it, and where its results are | Newest full run 2026-10-10, of the 12 cases of dotclaude 1.0.0 | `2.1.296` for the runs | `wiki/evidence/Evals.md`, with the cases in `src/plugins/claudetto/evals/`, `src/plugins/claudetto/slices/*/evals/`, and `src/plugins/claudetto-you-should-know/evals/` |
| [Model Guidance](Model-Guidance) | What the prompting guides, the `claude-api` skill, and the system cards say about false completion and the end of a turn | 2026-10-16 | `2.1.301` | `wiki/evidence/Model-Guidance.md` |
| [Failure Gaps of 0.1.0](Failure-Gaps-0.1.0) | The agent failure dossier compared with the mechanisms of claudetto 0.1.0 | 2026-10-16 | `2.1.301` | `wiki/evidence/Failure-Gaps-0.1.0.md` |

The design records of claudetto 0.1.0 are in `openspec/changes/claudetto-0-1-0/`.
The measurements of earlier releases are in [Evals History](Evals-History) and [Open Items](Open-Items).

## Related Pages

- [Handoff Cost](Handoff-Cost): the first measurement page to read after this index.
- [Usage Evidence](Usage-Evidence)
- [Prompt Variants](Prompt-Variants)
- [Evals](Evals)
- [Evals of 0.1.0](Evals-0.1.0)
- [Model Guidance](Model-Guidance)
- [Failure Gaps of 0.1.0](Failure-Gaps-0.1.0)
