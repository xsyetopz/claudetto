# `claudetto` Documentation

The documentation is in the files of this folder. A path that a page cites without the `archive/`
prefix is a path of the live tree, and a path of the tree before the `0.0.0` restart is cited with it.

## `docs/`

- [agent-misattribution.md](agent-misattribution.md): a task sent on 2026-10-29 to the read-only `Artemis` agent that needed a write, and the cause.
- [auto-mode.md](auto-mode.md): the `claude auto-mode` defaults, config, and critique run on `2.1.311`, and the `autoMode` lists setup wrote.
- [default-body-gap.md](default-body-gap.md): what the default system body carries that the agent file body that replaces it drops, item by item.
- [early-stops.md](early-stops.md): how 90 subagent runs of 2026-10-27 ended, and which final texts leave work open.
- [gates.md](gates.md): the tool gates and settings read from the Claude Code `2.1.311` program.
- [handoff-prior-art.md](handoff-prior-art.md): three prior-art handoff repositories, read with `file:line` citations.
- [instruction-surfaces.md](instruction-surfaces.md): the seven surfaces on which claudetto writes text, and the placement rule for a rule.
- [levers.md](levers.md): one row per Claude Code key, with its source and its measurement.
- [models.md](models.md): the evidence for model and effort levels, each claim marked `official`, `measured`, or `self-report`.
- [sandbox.md](sandbox.md): the sandbox keys of the `low-hitl` capability and the snippet that sets them.
- [surfaces.md](surfaces.md): the Claude Code surfaces that claudetto turns off and what each costs.
- [types.md](types.md): the vendored Claude Code types that the mod compiles against, and where they came from.
- [window-weights.md](window-weights.md): what `/usage` of `2.1.311` already shows, so the window recorder adds only what it lacks.

## `docs/prompt/`

- [prompt/footprint.md](prompt/footprint.md): the measured size of every prompt piece that a request carries, and the byte budgets.
- [prompt/machinery.md](prompt/machinery.md): the prompts Claude Code sends by itself, with the size and route of each.
- [prompt/overrides.md](prompt/overrides.md): how the prompt text of Claude Code is overridden, and the size of each override.
- [prompt/variants.md](prompt/variants.md): the switch for each prompt variant and what each costs.

## `docs/evidence/`

- [evidence/auto-mode-critique.md](evidence/auto-mode-critique.md): the stored raw reply of `claude auto-mode critique` over the facts of this project.
- [evidence/code-compaction-probe.md](evidence/code-compaction-probe.md): the results of the probe that compares built-in `/compact`, code compaction, and the handover.
- [evidence/compaction/boundaries.md](evidence/compaction/boundaries.md): what the built-in compaction did in this login's sessions, read from `compact_boundary` records.
- [evidence/compaction/threshold.md](evidence/compaction/threshold.md): a replay of three long transcripts against other compaction thresholds.
- [evidence/evidence.md](evidence/evidence.md): the index of the evidence pages and what each one backs.
- [evidence/grader-blindness.md](evidence/grader-blindness.md): why an eval grader that reads text scores the claim and not the work.
- [evidence/model-guidance.md](evidence/model-guidance.md): what Anthropic texts say about false completion, sycophancy, and the end of a turn.
- [evidence/probes-2.1.301.md](evidence/probes-2.1.301.md): probes of a plugin hooks file, an agent file, and a `Stop` hook input on `2.1.301`.
- [evidence/prohibition-lists.md](evidence/prohibition-lists.md): why a list of what not to do anchors the failure it forbids.
- [evidence/redaction.md](evidence/redaction.md): the secret redaction passes of the handoff writer and where each rule comes from.
- [evidence/reply-openings.md](evidence/reply-openings.md): the reading that turned down a structural check of reply openings.
- [evidence/stop-hook-eval.md](evidence/stop-hook-eval.md): an eval of a prompt hook on `Stop` that is too small to prove it blocks false claims.
- [evidence/usage-evidence/usage-evidence.md](evidence/usage-evidence/usage-evidence.md): the prices, models, and usage facts that claudetto relies on, each with a source label.

## `docs/keep/`

Verbatim records of Claude Code text (tool descriptions, bundled skills, plugin prompts, built-in commands, settings schemas, and the vendored Gitleaks config) that other pages cite and that are kept as read, and the third-party sources that the shipped files are built from, with each licence.

- [keep/commands/](keep/commands/): the built-in command list.
- [keep/gitleaks/](keep/gitleaks/): the vendored Gitleaks config and its licence.
- [keep/lucide/](keep/lucide/README.md): the ISC licence of Lucide and the SVG sources of the two plugin icons.
- [keep/plugins/](keep/plugins/): 16 records of plugin prompt text.
- [keep/settings/](keep/settings/): the vendored JSON schemas of the settings and managed settings.
- [keep/skills/](keep/skills/): one record for each of 46 bundled skills.
- [keep/tools/](keep/tools/): one record for each of 37 tool descriptions.

## `docs/dossier/`

Notes mined from the stranger posts and threads under `external/`, labelled `self-report` or `measured`, and not verified by this project.

- [dossier/handbook.md](dossier/handbook.md): what the `please-use-me-often` material says that a coding harness can use.
- [dossier/early.md](dossier/early.md): notes from the folders `external/2026-09-29` through `external/2026-10-08`.
- [dossier/mid.md](dossier/mid.md): notes from the Reddit threads of `external/2026-10-11` through `external/2026-10-13`.
- [dossier/late.md](dossier/late.md): cost findings from the folders of 2026-10-14, 2026-10-17, and 2026-10-21.
- [dossier/exports/exports.md](dossier/exports/exports.md): notes from the `external/export-*.jsonl` thread exports.
- [dossier/exports/part-2.md](dossier/exports/part-2.md): the second pass over the top-level thread exports the first left unread.
- [dossier/exports/part-3.md](dossier/exports/part-3.md): the third pass over the thread exports the first two left unread.
- [dossier/latest/latest.md](dossier/latest/latest.md): findings from the folders of 2026-10-22 through 2026-10-27 and `please-use-me-often`.
- [dossier/latest/part-2.md](dossier/latest/part-2.md): the files of those folders that the first latest page does not name.
- [dossier/sep/a.md](dossier/sep/a.md): 75 thread exports from 2026-09-29 through 2026-10-01.
- [dossier/sep/b.md](dossier/sep/b.md): the folders `external/2026-10-02` through `external/2026-10-04`.
- [dossier/sep/c.md](dossier/sep/c.md): 55 files from 2026-10-07 and 2026-10-08.
