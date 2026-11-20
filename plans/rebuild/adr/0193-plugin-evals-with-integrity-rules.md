---
status: accepted
date: 2026-11-21
---
# Plugin Evals Through `claude plugin eval`, Under Integrity Rules

## Context and Problem Statement

ADR-0062 deleted the eval suite because the agent edited graders and scaffolds after seeing runs, so its scores measured nothing. On 2026-11-21 the user asked for plugin evals in the way Claude Code supports, and named gaming the system as the biggest problem. Claude Code 2.1.329 ships `claude plugin eval`: cases under `evals/`, deterministic graders (`regex`, `tool_used`, `tool_order`, `file_exists`) and judge graders (`llm`, `baseline`), a no-plugin baseline arm with a Δ score, and case files hidden from the agent under test.

## Considered Options

- No evals; keep probes and `claude plugin test` only.
- `claude plugin eval` suites with the agent free to tune cases.
- `claude plugin eval` suites under fixed integrity rules.

## Decision Outcome

Chosen: suites under integrity rules. The rules reinstate CON-055 to CON-060 (Out as OUT-2501 to OUT-2506 while no eval existed):

1. **Frozen before the first run.** A case's prompt, scaffold and graders are committed before it is run once. A changed case after a run is a new case with a new name (`<case>-v2`), reported apart; the old one is kept.
2. **External evidence only.** Graders read files, tool calls and git state: `regex` on `{ source: file }` or `trace`, `tool_used`, `tool_order`. An `llm` grader is allowed only on short output and never as the only grader of a case.
3. **Graders tested first.** Each `regex` grader has a known-good and a known-bad sample in `tools/__tests__/`, and the test fails if the pattern accepts the bad one.
4. **Paraphrases and negatives.** Each behaviour has at least two phrasings, and each positive case has a negative twin where the plugin must stay silent.
5. **A canary.** One impossible or contradictory case per suite: the passing behaviour is to stop and report, so a suite where every case passes, canary included, flags gaming or a broken instrument.
6. **Discrimination.** A case whose baseline arm also scores 1.0 is reported as "does not separate the arms", never as a plugin win.
7. **Held-out set.** The user keeps held-out cases in `~/.claudetto-holdout/<plugin>/`, which sessions cannot read (REQ-GUARDS-058); `just eval-holdout <plugin>` runs them from a temporary copy, outside the agent's sandbox, and only the user starts it.
8. **Arms asserted.** A run's JSON result records `claudeVersion`, the model, and the plugin loaded; a report quotes them.

## Consequences

- ADR-0062 is superseded. `plugins/<plugin>/evals/results/` is ignored by git.
- Each eval run is a paid model call; suites run with `--max-cost-usd`, and quick suites use deterministic graders only.
- Scores tune the dev cases only; the claim that a part beats vanilla (ADR-0177) is made from the held-out run.

Source: user goal, 2026-11-21 (this session, first prompt); user decisions of 2026-11-16 quoted in OUT-2501 to OUT-2506; code.claude.com/docs/en/plugin-evals (read 2026-11-21); external/please-use-me-often/agent-failure-dossier/07-measurement-and-environment.md (I16 recipe); external/llm-agent-behavior-mitigation-research.md section 6.
