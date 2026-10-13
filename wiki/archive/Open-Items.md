# Open Items

This page lists the measures, decisions, and claims about dotclaude that are still open after 0.28.0.
Each open item has a reason and an owner.
The owner is the user or the next session.
Labels: **measured** means a run on this machine, and **reported** means a claim from a user.

## Summary

- 14 items are open.
- 11 items were closed or made moot by 0.27.0 and 0.28.0.
- 11 claims from users were checked and not acted on.

## Open Items

| Item | Reason it is open | Owner | What would close it |
| --- | --- | --- | --- |
| The `context_management` hook in a live session | The lab tests pass, but on this machine the built-in guard `sec-default` loads, because the machine has managed settings, and it skips the hook (**measured**). Both fixes need `sudo` ([Request build](Request-Build#the-built-in-guard-sec-default)). | The user | Remove the managed settings files, or add `dotclaude` to managed `prependPlugins` from a local marketplace folder. Then check the system prompt in a sandbox session. |
| The mods API can change between releases | The hooks module uses many events of the mods API. The API is documented, but it is new, and a change can break `hooks/register.ts` with no compatibility layer. | The next session | Run `just lab` on each new Claude Code release before you move the pin. |
| The 300K window | The window is a judgment from reports (rot "around 300-400K" on a 1M window, and "200K is the sweet spot"). It is not from a measure on this machine (**reported**). | The user | A week of sessions, then a look at where the quality drops and where sessions stop. |
| Usage report after a week on 0.27 | No week of 0.27 data exists yet. | The next session | Run `just usage --days 7` and compare it with [Usage evidence](Usage-Evidence). |
| A capability eval suite | 0.28.0 ported a suite of 16 cases to `claude plugin eval` ([Evals of 0.28.0](Evals-0.28.0#ported-suite)). It is not the blind, frozen suite that this item asks for. | The user | A blind, frozen suite written before any run, for long sessions, corrections over several turns, and large repositories. |
| `implementer` on Opus 5.5 against Sonnet 5.5 | The runs on this machine had different tasks (see [Model fit](Usage-Evidence)). The ProjectArchitect Bench A/B is outside evidence on a different harness with a private hard tier. | The user | Run both models on the same tasks. Anthropic recalibrated the effort levels of Sonnet 5.5, so also re-check the `medium` setting of the Sonnet agents. |
| Per-turn effort changes in one long-lived process | No data: each effort value in the transcripts of 2026-10-04 and 2026-10-05 is `medium`. | The next session | Measure the changes in one long-lived process. |
| A Bash read of a directory does not load its `CLAUDE.md` or path-scoped `.claude/rules` files | Open in Claude Code ([#90450](https://github.com/anthropics/claude-code/issues/90450)). Claude Code 2.1.288 loads rules on Write and Edit. | The user (a fix in Claude Code) | A fix in Claude Code. |
| The model and effort of the agents | The user set them in the `agents/*.md` frontmatter on 2026-10-09 from a router search of the removed eval harness and the effort guide of Anthropic. The `search`, `web`, `bulk`, and `audit` cases did not separate the pairs. The pairs for `debug` and `audit`, and each `medium` that is one step above a tested `low`, are inferred ([Agents](Agents)). | The user | Harder cases for those roles, run with `claude plugin eval` ([Evals](Evals)). |
| The source of the `xhigh` effort cap | A hook-set `max` arrives as `xhigh`. The cause is probably an account limit for each model (**unverified**). | The next session | A probe on a second account. |
| A fixed prompt variant after a model switch | The variant stays as chosen at session start, and the user can switch the model with `/model`. Whether this costs adherence is not measured ([System prompt](Prompt-Surface)). The eval format has no arm for a variant. | The user | A hand comparison of the variants for each model. |
| The compact prompt | Claude Code has no route to override it. The settings snippet disables compaction instead ([Prompt variants](Prompt-Variants#the-compact-prompt-gap)). | None | A route in a later Claude Code version. |
| The cause of the 30K start in some windows | Research found it only when the settings snippet did not apply (**inferred**). | The user | A check in the terminal, the desktop app, and the IDE with `/context`. |
| The 0.28.0 evals | The output style size, the `<text_format>` block, and the evidence line have no arm in the ported suite. The reason is that the format has only the plugin arm and the no-plugin arm ([Evals of 0.28.0](Evals-0.28.0-Gates#gates-of-the-deleted-harness)). | The user | A suite and its figures in [Evals](Evals). |

## Closed Items

| Item | Closed by |
| --- | --- |
| The compaction handoff and its retention baseline | 0.27.0. Compaction is off, and the user writes each note. |
| A week with compaction at 150k | 0.27.0. The settings turn compaction off. |
| What the user does after a handoff note | 0.27.0. No hook tells the user to run `/clear`. |
| The line-break hook (`sembr`) | 0.28.0 adds a new formatter and hooks ([Semantic line breaks](Semantic-Line-Breaks)). |
| The behavior of the `tool.check` ask in auto mode on 2.1.292 | Measured on 2026-10-07: the classifier allowed the ask of the module, so 0.27.0 added a classic hook for the `rm` ask. 0.28.0 replaces that hook with `ask` permission rules and the sandbox. |
| The stop at the 300K window | Measured on 2026-10-07: the turn ended with `blocking_limit`, and no compaction ran ([Design](Design)). |
| The OpenSpec resume after `/clear` | Measured on 2026-10-07: `/opsx:apply` in a fresh session continued at the first unchecked task ([OpenSpec history](OpenSpec-History#measured-flow)). |
| Full model id, `haiku` alias, and the effort clamp | A full id works in `agent.spawn`. The `haiku` alias is Haiku 5.5 on the Anthropic API and Haiku 4.5 on Bedrock, Vertex, and Foundry (docs only, no probe there). `maxEffortLevel: max` causes no clamp, and a hook-set `max` arrives as `xhigh` ([Decisions](Decisions-Router)). |
| The session ledger race | 0.20.0 |
| The debug escalation of the router | 0.28.0 removed the router (design D35). The agent files hold the model and effort. |
| The shape of a usage-limit hit | The transcripts of 2026-10-04. It is an `assistant` entry with `error` set to `rate_limit`, `isApiErrorMessage` set to true, `apiErrorStatus` 429, and the model `<synthetic>`. The usage report counts this shape. |

## Claims Not Acted On

| Claim | Finding |
| --- | --- |
| Two Max 5x plans against one Max 20x | One user reports that Max 20x gives about 1.7 times the weekly usage of Max 5x. Anthropic does not state a weekly ratio. 0.27.0 has no plan detection. |
| Auto mode's classifier sends the whole transcript on every Bash call | Not checked in the binary. |
| A Haiku ping keeps the cache warm | Caches are per model, so a Haiku request cannot keep an Opus or Fable cache warm. |
| A cold cache costs 10 times more on Opus and 40 times on Fable | The official cache prices do not produce these ratios. |
| A Sonnet session started 8 Fable agents on extra usage | One report. The 0.27 profile leaves Fable out of `availableModels`. |
| Opus 5.5 got worse after its release | Public trackers do not agree. One shows 103.8% of the score at release. The Reddit threads of 2026-10-03 report the same. They are in `external/2026-10-03/`, a local source of the maintainer. |
| A tool-call batching rule saves about 20% of tokens on Opus 5.5 | One user measured it, and a stronger wording made reviews worse. Claude Code already tells Claude to make independent calls together. |
| Non-Claude model serving (parts 04, 05, 23, and 29 of the external reports) | Quantization, routing, and serving of the models of other vendors are outside the reach of a plugin. |
| Refusals by a safety classifier | A plugin cannot change the classifier of the model or of the engine. |
| DensePack | A tool that a user built to save usage. No measurement shows that it helps, and it compresses text with loss. |
| Domain checklists | A checklist per field, such as security or accessibility. No evidence shows that a checklist raises the pass rate, and the reports are not a spec. |

## Related Pages

- [Usage Evidence](Usage-Evidence)
- [Evals](Evals)
- [Eval History](Evals-History)
- [Archive of 0.28](Archive-0.28)
- [Archive](Archive)
