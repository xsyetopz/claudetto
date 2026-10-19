# Proposal: evals-redesign-0-2-0

## Why

The 11 hard `prompt` cases of `effd5ac5` were written by agents that read the rule text of the plugin first.
So a gap between the arms can come from the way the cases were made, and not from the plugin (construct validity, ABC R.5 and R.6).
The rewrite also replaced the cases of the published results, so the new numbers cannot be compared with the old ones.
At 10 runs for each arm, a gap of less than about 5 passes out of 10 is not significant for one case.
The user said "go ahead with the redesign plan" (2026-10-20).

## What Changes

- Restore the 11 `prompt` cases of `a21b2ae1` as the `baseline` set, under their old names.
- Keep the hard cases as the `rule-aware` set, with the suffix `-hard`.
- Add a `blind` set: cases that an author writes from a behavior description only, with no access to the rule text or the plugin.
- Add a `control` set: cases where the plugin must not change the result.
- Give each case a reference run that passes each deterministic grader, and a no-op run that fails.
- Add `tools/eval-stats.ts`: Fisher exact p and a Newcombe CI for each case, and a bootstrap CI over the cases of each set.
- Report each set apart, with CIs, in the evidence page.

## Sources

- Anthropic, "Demystifying evals for AI agents": https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
- ABC, "Establishing Best Practices for Building Rigorous Agentic Benchmarks": https://arxiv.org/abs/2507.02825
- Anthropic, "A statistical approach to model evaluations": https://www.anthropic.com/research/statistical-approach-to-model-evals
- `claude plugin eval` docs: https://code.claude.com/docs/en/plugin-evals
