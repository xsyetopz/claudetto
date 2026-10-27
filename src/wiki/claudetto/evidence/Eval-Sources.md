# Eval Sources

This page lists the outside sources that the eval rebuild of `openspec/changes/eval-rebuild/` copies, adapts, or takes an idea from.
Each row names the claim that the source backs.
A claim that the research could not confirm on the page itself is marked `unconfirmed`.
The research ran on 2026-10-27 with web search and page fetches, and it made no paid model call.
Other pages cite a row of this page and do not repeat the link.

## Eval Design and Statistics

| Source | Link | What it backs | Use |
| --- | --- | --- | --- |
| Anthropic, "A statistical approach to model evals" (Evan Miller) | [anthropic.com](https://anthropic.com/research/statistical-approach-to-model-evals), [arXiv 2411.00640](https://arxiv.org/abs/2411.00640) | Use paired differences on the same questions, cluster the standard errors when questions share a source, resample answers per question, and choose the number of questions with a power analysis. Clustered errors were over 3 times the naive ones on popular evals. | Copy, in `just eval-stats` |
| Anthropic, "Demystifying evals for AI agents" | [anthropic.com](https://anthropic.com/engineering/demystifying-evals-for-ai-agents) | Start with 20 to 50 tasks from real failures. Prefer deterministic graders. Calibrate a model judge against people, give it an "Unknown" option, and use one judge for each dimension. Isolate each trial, because Claude read the git history of earlier trials. | Copy the grader and isolation rules |

## Compaction and Long Sessions

| Source | Link | What it backs | Use |
| --- | --- | --- | --- |
| ConstraintRot, "Governance Decay" | [arXiv 2606.22528](https://arxiv.org/abs/2606.22528) | 1,323 episodes over seven model families, graded on tool calls with code. Violations rise from 0% with the policy in context to 30% after compaction, and to 38% when the summary drops the constraint. Pinning the constraint restores 0%. No code repository is linked (`unconfirmed`). | Idea, for the handoff constraint probe |
| Factory, "Evaluating context compression" | [factory.com](https://factory.com/news/evaluating-compression) | Over 36,000 messages of real coding sessions, with four probes at each compression point: recall, artifact tracking, continuation, and decisions. A GPT-5.2 judge scores 0 to 5 and does not know the method. No confidence intervals. Data release `unconfirmed`. | Copy the four probes, with code graders in place of the judge |
| LongMemEval | [GitHub](https://github.com/xiaowu0162/LongMemEval) | 500 questions over long chat histories, graded by GPT-4o. MIT. | Idea only, because it tests chat memory |
| Chroma, "Context Rot" | [trychroma.com](https://trychroma.com/research/context-rot) | Performance falls as the input grows, over 18 models. Seen in search snippets only (`unconfirmed`). | Background |
| CliffCompaction | [arXiv 2609.26779](https://arxiv.org/pdf/2609.26779) | Compaction on SWE-bench Verified and Terminal-Bench against Claude Code autocompaction. Seen in a search summary only (`unconfirmed`). | Background |
| "What to Keep, What to Forget" | [arXiv 2607.08032](https://arxiv.org/abs/2607.08032) | A benchmark proposal. Size and grader not stated. | Background |

## Permission and Safety Classifiers

| Source | Link | What it backs | Use |
| --- | --- | --- | --- |
| Anthropic, "How we built Claude Code auto mode" | [anthropic.com](https://www.anthropic.com/engineering/claude-code-auto-mode) | Three sets: 10,000 real internal tool calls for false positives, 52 real overeager actions for misses, and 1,000 synthetic exfiltration attempts. The full pipeline has a false-positive rate of 0.4% and a miss rate of 17%. The sets are not stated as released. | Copy the three-set design and the two rates for each stage |
| AmPermBench | [arXiv 2604.04978](https://arxiv.org/abs/2604.04978) | 128 prompts and 253 state-changing actions against an oracle. About 36.8% of state-changing actions are in-project file edits that the auto mode classifier never checks. Code release `unconfirmed`. | Idea, for the file-edit cases of the replay set |
| InjecAgent | [GitHub](https://github.com/uiuc-kang-lab/InjecAgent) | 1,054 single-turn cases over 17 user tools and 62 attacker tools. MIT. | Adapt, as the attack set of the replay |
| AgentDojo | [GitHub](https://github.com/ethz-spylab/agentdojo), [paper](https://arxiv.org/html/2406.13352v3) | 97 tasks and 629 security cases, scored on both utility and attack success. MIT. | Idea: score a defense on the task and on the attack together |

## Coding-Agent Benchmarks

| Source | Link | What it backs | Use |
| --- | --- | --- | --- |
| Terminal-Bench 2.0 with Harbor | [dataset](https://huggingface.co/datasets/harborframework/terminal-bench-2.0/blob/main/README.md), [GitHub](https://github.com/laude-institute/terminal-bench), [arXiv 2601.11868](https://arxiv.org/html/2601.11868v1) | Terminal tasks in Docker, with a Claude Code agent in Harbor. Apache-2.0 for the dataset. 89 tasks per [EvalScope](https://evalscope.readthedocs.io/en/v1.4.1/third_party/terminal_bench.html), a secondary source. About $0.32 to $0.36 per task on Haiku 4.5 per [JFrog](https://boost.jfrog.com/blog/benchmarks-terminal-bench/) (`unconfirmed`, third party). | Candidate for the paid release tier, plugin on against off |
| SWE-bench Verified and Verified Mini | [GitHub](https://github.com/SWE-bench/SWE-bench), [HAL](https://hal.cs.princeton.edu/swebench_verified_mini) | 500 problems in Verified and 50 in Verified Mini, graded by the tests of each repo. MIT for the harness. The agreement of Mini with the full set is claimed with no statistic (`unconfirmed`). | Alternative release tier |
| SWE-bench Lite | [Steel](https://leaderboard.steel.dev/registry/benchmarks/swe-bench-lite) | 300 problems, per a third-party page (`unconfirmed`). | Background |
| Aider polyglot | [GitHub](https://github.com/Aider-AI/polyglot-benchmark), [post](https://aider.chat/2024/12/21/polyglot.html) | 225 Exercism exercises in six languages, graded by tests. Content under the Exercism licenses. Costs per run from a [mirror](https://www.developersdigest.tech/benchmarks/aider-polyglot) (`unconfirmed`). | Idea only, because its harness drives Aider |
| tau2-bench | [GitHub](https://github.com/sierra-research/tau2-bench) | Tool-using service agents, 50 frozen tasks for each domain, graded on state, with a model judge for text assertions. MIT. `--num-tasks` gives a cheap smoke tier. | Idea: a small smoke tier with a flag |

## Not Researched

METR task suites, LiveCodeBench, coding benchmarks of 2026 not named above, the eval guidance of OpenAI, and the license of the Harbor framework.

## Related Pages

- [Evidence](Evidence)
- [Evals](Evals)
- [Eval Graders](Eval-Graders)
- [Code Compaction Probe](Code-Compaction-Probe)
