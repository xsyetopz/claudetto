# Evidence

This page is the index of the evidence pages.
Read it to find the page and the source file of a measurement.
Each row gives what the page measures, its date, its Claude Code version, and its source file.
If a page does not state a date or a version, the row says "not stated".

## Measurement Pages

| Page | What it measures | Date | Claude Code version |
| --- | --- | --- | --- |
| [Handoff Cost](Handoff-Cost) | The cost of one handoff of an earlier release (1.0.0) and one `/compact`, from the same session | 2026-10-12 | `2.1.296` |
| [Usage Evidence](Usage-Evidence) | The prices, the models, the cache, and one measured week of usage, with the guard denies and the code graph add-on | Measured week 2026-09-21 to 09-28, prices of 2026-10-13, other measures of 2026-10-03 to 10-18 | `2.1.287` for one fact, otherwise not stated |
| [Prompt Size](Prompt-Size) | The size of the tailored prompt text, and the gap in the compact prompt | 2026-10-19 | Not stated |
| [Evals](Evals) | The suite of 19 cases, how to run it, and where its results are | Newest full run 2026-10-10, of an earlier suite | `2.1.296` |
| [Eval Graders](Eval-Graders) | The grader kinds, the file-state graders, and the open facts of `claude plugin eval` | Not stated | `2.1.296` to `2.1.302` |
| [Evals of 0.1.0](Evals-0.1.0) | The paid runs of the `Concise` style cases on Haiku 5.5 | 2026-10-16 to 2026-10-17 | `2.1.301`, `2.1.302` |
| [Evals History](Evals-History) | The off-switch eval, the compaction bench, the model sweeps, and the full run of the earlier suite | 2026-09-27 to 2026-10-10 | `2.1.287` to `2.1.296` |
| [Model Guidance](Model-Guidance) | What the prompting guides, the `claude-api` skill, and the system cards say about false completion and the end of a turn | 2026-10-16 | `2.1.301` |
| [Prohibition Lists](Prohibition-Lists) | The texts of the plugins that keep a list of `Do not` sentences | 2026-10-16 | Not stated |
| [Probes of 2.1.301](Probes-2.1.301) | What a plugin `hooks.json`, a plugin agent, and the `Stop` input accept | 2026-10-16 | `2.1.301` |
| [Stop Hook Eval](Stop-Hook-Eval) | The behavior of a `type: "prompt"` hook on `Stop` | 2026-10-07 to 2026-10-12 | `2.1.292`, `2.1.296` |

The design records of claudetto 0.1.0 are in `openspec/changes/claudetto-0-1-0/`.
The source of each page is the file `src/wiki/claudetto/evidence/<Page>.md`.

## Related Pages

- [Handoff Cost](Handoff-Cost): the first measurement page to read after this index.
- [Usage Evidence](Usage-Evidence)
- [Evals](Evals)
- [Model Guidance](Model-Guidance)
