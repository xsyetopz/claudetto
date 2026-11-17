# Introduction and Goals

## Requirements Overview

The requirements are in [the PRD](../prd/README.md): purpose, scope, and one file per block.

| Block | Requirements |
| --- | --- |
| [`kernel`](../prd/kernel.md) | 28 |
| [`guards`](../prd/guards.md) | 72 |
| [`handover`](../prd/handover.md) | 71 |
| [`delegation`](../prd/delegation.md) | 63 |
| [`reply`](../prd/reply.md) | 137 |
| [`cost`](../prd/cost.md) | 43 |
| [`setup`](../prd/setup.md) | 64 |
| [`edit`](../prd/edit.md) | 2 |
| [`openspec`](../prd/openspec.md) | 3 |
| [`you-should-know`](../prd/you-should-know.md) | 75 |
| [`verification`](../prd/verification.md) | 92 |

## Quality Goals

The quality scenarios of [section 10](10_quality_requirements.md), in its order:

- [Agent Tool Size](10_quality_requirements.md#agent-tool-size)
- [Tool Text Size](10_quality_requirements.md#tool-text-size)
- [Stop Check Quality](10_quality_requirements.md#stop-check-quality)
- [Reply Register Scoring](10_quality_requirements.md#reply-register-scoring)
- [Hot Path](10_quality_requirements.md#hot-path)
- [Repo Gate And Footprint](10_quality_requirements.md#repo-gate-and-footprint)
- [Cache](10_quality_requirements.md#cache)
- [Session Length](10_quality_requirements.md#session-length)
- [Rereads](10_quality_requirements.md#rereads)
- [Tests And Code](10_quality_requirements.md#tests-and-code)
- [Prompt Size](10_quality_requirements.md#prompt-size)
- [Duplication](10_quality_requirements.md#duplication)
- [Length Targets of the 2.1.325 Goal](10_quality_requirements.md#length-targets-of-the-21325-goal)

## Stakeholders

| Stakeholder | Expectation | Source |
| --- | --- | --- |
| The user, `xsyetopz`, owner of the repository and sole user | Coding in Claude Code at the lowest token cost | `plugins/claudetto/.claude-plugin/plugin.json:4` at `088a227c` |
| Claude Code 2.1.326, the host | claudetto uses its official extension points only and patches nothing | `plugins/claudetto/.claude-plugin/plugin.json:4` at `088a227c`; user decision, 2026-11-16 (`0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:10743`) |
