---
status: accepted
date: recorded in openspec/changes/2-1-325-rearchitecture/design.md:423-432 (day of decision not recorded)
---
# Source Verdicts Of The Rearchitecture

## Context and Problem Statement

The 2-1-325 rearchitecture design read each URL its goal listed, 2026-11-15 to 2026-11-16, with no paid call, and gave each a verdict in its Sources table. The rebuild plan names only Hightouch, Rieseberg, karpathy, and OpenCraft; it holds no line for the sources below.

## Considered Options

- Donchitos/Claude-Code-Game-Studios.
- WorldFlowAI/everything-claude-code.
- OneRedOak/claude-code-workflows.
- How Boris uses Claude Code.
- Blake Crosley, AGENTS.md patterns.
- Marmelab, state of AI harness engineering 2026.

## Decision Outcome

Chosen: reject each source below.

- Donchitos/Claude-Code-Game-Studios: rejected. It has 49 agents and 72 skills plus a `project.yaml` rigor knob; claudetto ships 4 agents, and setup writes only settings.
- WorldFlowAI/everything-claude-code: rejected. Prompt slimming and compaction handoff are already measured and built; the rest adds agents, commands, and scripts against the no-growth target.
- OneRedOak/claude-code-workflows: rejected. Review commands and CI add files; the dossier rejected a Stop-hook gate as noise.
- How Boris uses Claude Code: adopted in part. Verification first, a worktree per committing worker, and Opus at medium effort stay; its format hook and per-task commands are rejected because they add hooks and files.
- Blake Crosley AGENTS.md patterns: rejected. The project CLAUDE.md is already command-first; a done-criteria and escalation block would add root-prompt bytes, and a Stop gate measured as noise.
- Marmelab harness engineering: adopted as the Goal and Measured Targets ("Reduce the harness to the strict minimum", "measure how the harness is actually used"); guards run as code over prose, each control carries its reason, tests cover both fire and no-fire, and an error names the fix that clears it.

## Consequences

- Good: a later reader finds why each source was not copied.
- Bad: the verdicts rest on the design file's reading (reported); the rebuild has not re-read the pages.

Source: openspec/changes/2-1-325-rearchitecture/design.md:423-432.
