> Saved from `wiki/claudetto/evidence/Evidence.md` at `HEAD`. The wiki is gone.

# Evidence

Evidence pages show what was measured, how, and the result.
They back the values that the shipped code carries.
Each row below names a page, what it measures, and when.

The pages that recorded the removed `claude plugin eval` harness, the `dev/sandbox` arms, and the
`dev/` probes are deleted with the `0.0.0` restart, because none of those producers is in the tree.
Their numbers stay in the git history.

## Measurement Pages

| Page | What it measures | Date | Claude Code version |
| --- | --- | --- | --- |
| [Usage Evidence](usage-evidence/usage-evidence.md) | Prices, models, cache, and one week of usage | 2026-09-21 to 2026-10-17 | `2.1.287` for one fact, otherwise not stated |
| [Stop Hook Eval](stop-hook-eval.md) | The behavior of a `type: "prompt"` hook on `Stop` | 2026-10-07 to 2026-10-12 | `2.1.292`, `2.1.296` |
| [Model Guidance](model-guidance.md) | What guides and system cards say about false completion | 2026-10-16 | `2.1.301` |
| [Prohibition Lists](prohibition-lists.md) | Plugin texts that keep a list of `Do not` sentences | 2026-10-16 | Not stated |
| [Probes of 2.1.301](probes-2.1.301.md) | What a plugin `hooks.json`, agent, and `Stop` input accept | 2026-10-16 | `2.1.301` |
| [Code Compaction Probe](code-compaction-probe.md) | Cost, quality, and cache of the built-in `/compact`, code compaction, and the handover | 2026-10-26 | `2.1.310` |
| [Auto Mode Critique](auto-mode-critique.md) | What `claude auto-mode critique` answers about the rules of this project | 2026-10-27 | Not stated |
| [Compaction Boundaries](compaction/boundaries.md) | Where this login's own sessions compacted | 2026-10-28 | `2.1.312` |
| [Compaction Threshold](compaction/threshold.md) | This login's work replayed against other compaction thresholds | 2026-10-28 to 2026-10-30 | `2.1.312` |
| [Reply-Opening Signal](reply-openings.md) | Whether a structural check can read the opening of a reply | 2026-10-28 | Not stated |
| [Grader Blindness](grader-blindness.md) | That a grader reading text scores the claim and not the work | 2026-10-29 | Not applicable |
| [Redaction](redaction.md) | The secret redaction of the handoff, read from the bundle | 2026-10-29 | `2.1.312` |

## Related Pages

- [Usage Evidence](usage-evidence/usage-evidence.md)
- [Model Guidance](model-guidance.md)
