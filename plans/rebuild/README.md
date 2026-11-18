# claudetto Rebuild Plan

The plan for claudetto on Claude Code 2.1.327. Four standards split it; each file answers one question, and each item lives in one file only.

## Layout

| Path | Standard | Answers |
| --- | --- | --- |
| `prd/README.md` | ISO/IEC/IEEE 29148:2018 clauses 9.6.2-9.6.9 | What are we building? Purpose, scope in and out, Claude Code interfaces, users, limits, assumptions, deferred work |
| `prd/<block>.md` | ISO/IEC/IEEE 29148:2018 clauses 9.6.10-9.6.12 | What counts as success? One requirement per item, with its acceptance check |
| `arc42/01_introduction_and_goals.md` | arc42 9.1 section 1 | Requirements overview (links to `prd/`), top quality goals, stakeholders |
| `arc42/02_architecture_constraints/` | arc42 section 2 | What constraints must be preserved? |
| `arc42/03_context_and_scope/` | arc42 section 3 | Claude Code 2.1.327 seams and measured facts about them, one file per topic |
| `arc42/04_solution_strategy.md` | arc42 section 4 | The few ideas the whole design rests on |
| `arc42/05_building_block_view.md` | arc42 section 5 | What components exist, at baseline `088a227c` and in the target? |
| `arc42/06_runtime_view/` | arc42 section 6 | How does the system behave at runtime? Algorithms and pseudocode |
| `arc42/07_deployment_view.md` | arc42 section 7 | How does it deploy? Install, marketplace, settings, release |
| `arc42/08_concepts/` | arc42 section 8 | Rules that hold across blocks |
| `arc42/09_architecture_decisions.md` | arc42 section 9 | Index of `adr/` only |
| `arc42/10_quality_requirements.md` | arc42 section 10 | How is quality measured? Quality scenarios with a measure |
| `arc42/11_technical_risks.md` | arc42 section 11 | Index of `risk-register/` only |
| `arc42/12_glossary.md` | arc42 section 12 | Terms |
| `adr/NNNN-<title>.md` | MADR 4.0.0 | Why was this design selected? One decision per file |
| `risk-register/<block>.md` | ISO 31000:2018 process fields | What known problems remain? Each medical error with its cure, in the file of its owning block |
| `reference/you-should-know-prompt.md` | none | Verbatim copy of the `cc-plugin-you-should-know@builtin` prompt |

An arc42 section file over 300 lines becomes a directory of the same name with a `README.md` index and one file per template subsection (a runtime scenario, a concept, a white box). Subsections whose titles share a leading phrase share one file, so no file name extends another.

## Blocks

`<block>` is one of these eleven, taken from the baseline `plugins/` tree at `088a227c`:

| Block | Baseline parts |
| --- | --- |
| `kernel` | `hooks/kernel/` |
| `guards` | `features/protected`, `secrets`, `repeat`, `line-file`, `web`, `temp-cleanup`, `hygiene`, `bin/claudetto-hygiene` |
| `handover` | `features/compaction`, `memory`, `scripts/pre-compact.ts`, `scripts/session-start.ts` |
| `delegation` | `agents/`, `features/delegation`, `agent-model` |
| `reply` | `output-styles/`, `rules/`, `features/prompt`, `reply`, `stop-notice` |
| `cost` | `features/budget`, `price-step`, `decide`, `statusline/`, `bin/claudetto-statusline` |
| `setup` | `features/setup`, `surface`, `commands/setup.md`, the `@builtin` disable |
| `edit` | the perl batch edit tool |
| `openspec` | `plugins/claudetto-openspec/` |
| `you-should-know` | `plugins/claudetto-you-should-know/` |
| `verification` | `evals/`, tests, release checks |

## Routing

Each item goes to the first rule it matches.

1. A failure of the agent or product, with its cure: `risk-register/<block>.md`.
2. A choice among named options, a settled conflict, a user answer, or a superseded rule: `adr/`.
3. A part, behaviour, or file that goes, with no competing option: `prd/README.md`, scope "Out".
4. A behaviour that a user or Claude Code can observe: `prd/<block>.md`.
5. A fixed outside limit (Claude Code 2.1.327, macOS sandbox, licence, a user rule): arc42 section 2.
6. A measured or documented fact about Claude Code or the machine: arc42 section 3.
7. How one block does its job (algorithm, pseudocode, sequence): arc42 section 6.
8. A rule across two or more blocks: arc42 section 8.
9. A quality target with a number: arc42 section 10.
10. What exists at `088a227c`: arc42 section 5, under its block.
11. A term: arc42 section 12.

## Item Format

```
- [ ] **REQ-HANDOVER-001** claudetto shall <behaviour>.
  Acceptance: <the check that passes>. Verification: test | probe | inspection | demonstration.
  Basis: measured | cited | reported | observed in transcript | user decision | inferred. Status: have | partial | missing at 088a227c.
  Source: <attribution>; <attribution>.
```

ID prefixes: `REQ-<BLOCK>-NNN`, `REQ-DEFERRED-NNN` (`prd/README.md`, clause 9.6.9), `OUT-NNN`, `CON-NNN` (section 2), `CTX-NNN` (section 3), `STR-NNN` (section 4), `BB-NNN` (section 5), `RT-NNN` (section 6), `DEP-NNN` (section 7), `CC-NNN` (section 8), `QS-NNN` (section 10), `TERM-NNN` (section 12), `RISK-NNN`, `ADR-NNNN`.

Each risk carries the fields: Category, Cause, Event, Consequence, Likelihood, Impact, Existing controls, Response (avoid | mitigate | transfer | accept), Actions, Trigger, Owner (a block), Status, Source.

- Likelihood: 1 one report; 2 two or more reports; 3 reproduced once; 4 reproduced in two or more runs; 5 measured in most sessions.
- Impact: 1 cosmetic; 2 an extra turn; 3 a wasted session or spend; 4 a wrong result shipped or user work lost; 5 a secret leaked or data destroyed.

## Attribution

Each item names every source it rests on, in one of these forms:

| Source | Form |
| --- | --- |
| Dossier or Reddit export | `external/<path>:<line>`, plus the thread URL from the export header |
| Deleted OpenSpec | `openspec/<path>:<line>` at `088a227c^` |
| Baseline code | `plugins/<path>:<line>` at `088a227c` |
| Probe on Claude Code | probe name, `claude` version, date, and the command |
| Session log | `~/.claude/projects/<project dir>/<session>.jsonl:<line>` |
| Web page | URL and retrieval date |
| User decision | "user decision", date |

No letter keys such as `Src: C:86`.

Session logs dated 2026-11-09 to 2026-11-16 (for example `17435f50`, `b8e1aaed`, `cd2e74f0`) are no longer on disk: on 2026-11-18, `~/.claude/projects/` holds 58 main transcripts, all modified on 2026-11-17 or later, and no copy exists elsewhere under `~/.claude`. A citation to one of them points at text first recorded in this plan by commit 6e6edcd19 (2026-11-13) or the curation commits after it, while the log existed. The git history of the citing line is its surviving evidence. A user decision cited this way remains in force, because the user restated it when giving later directions (for example, Fable and Opus are never a subagent model).

## Attributions

- arc42 template 9.1-EN, created by Dr. Peter Hruschka, Dr. Gernot Starke and contributors, <https://arc42.org>, CC BY-SA 4.0. The `arc42/` section titles and order come from it.
- MADR 4.0.0, <https://adr.github.io/madr/>, MIT or CC0-1.0. The `adr/` file layout comes from it.
- Michael Nygard, "Documenting Architecture Decisions", 2011: sequential ADR numbers and superseded records kept.
- ISO/IEC/IEEE 29148:2018 clause 9.6 outline, read through <https://github.com/wxinix/IEEE-29148-SRS-LaTeX-Template>.
- ISO 31000:2018 register fields, read through <https://easyrisk.io/resources/risk-log-template> and <https://www.smartsuite.com/guides/risk-register-and-risk-assessment-matrix>.

## Sources Audited

| Source | Count | Coverage |
| --- | --- | --- |
| Old curation plan, `plans/rebuild-curation.md@0e987414` | 1,074 checkbox items | Each item maps to an ID or a ledger outcome: 1,074 of 1,074. |
| Gap lines from the `external/` and `openspec/` sweep | 1,411 lines | 1,252 routed, 143 merged into another item, 16 dropped with a reason. |
| Deleted OpenSpec, `openspec/` at `088a227c^` | 1,388 files | Read through the old curation plan and the gap sweep. |
| `external/` dossier | 1,040 files | Read through the old curation plan and the gap sweep. |
| Session logs, `~/.claude/projects/` | 491 typed user turns in 99 sessions of 31 project folders, 2026-11-09 to 2026-11-16 | Each turn maps to an ID or a ledger outcome: 491 of 491. |
| Rare tokens (identifiers, env vars, paper ids) in `external/` and `openspec/` absent from the plan text | 183 tokens | 124 found in the built plan; 59 checked by hand: 20 already covered, 30 new as 21 items, 9 dropped with a reason. A rerun against the old curation plan found 3 tokens lost in rewriting (arXiv 2508.21433, `CLAUDE_CODE_DISABLE_REFUSAL_FALLBACK`, the four parallel `$.fs.list` calls); all 3 were restored. |

Items whose source line was not found (the item stays, with the source the old plan named), by old-plan chunk: 01: 11, 02: 5, 03: 3, 04: 37, 05: 17, 06: 12, 07: 17, 08: 20, 09: 22, 10: 1, 11: 0. Total 145.

Items removed on 2026-11-18 because no source for them was located in `external/`, `openspec/` at `088a227c9^`, `reports/`, git history, or the user's transcripts (13): `CTX-334`, `OUT-033`, `OUT-078`, `OUT-103`, `REQ-COST-036`, `REQ-DELEGATION-022`, `REQ-GUARDS-007`, `REQ-GUARDS-017`, `REQ-GUARDS-054`, `REQ-HANDOVER-044`, `REQ-HANDOVER-066`, `REQ-KERNEL-010`, `REQ-VERIFICATION-077`. Their text stays readable in git history before the removal commit. Two items in the same state were kept with a located source instead: REQ-DELEGATION-026 (user decision on subagent models) and REQ-VERIFICATION-075 (the user's global test rule).

Known limits of the audit:

- Early slices given to the Artemis search worker on Haiku thrashed, and reads past about 100k tokens were withheld; big slices then moved off Artemis and Haiku.
- Evidence `.ts` and JSON files in `openspec/` were judged through their READMEs and by grep.
- Batches 01r, 12r and 26 matched by keyword only.
- Slice 3rb-aa only skimmed evidence folders 18-8, 18-10 and 18-11.
- Batch 16 did not re-verify 20 of its 23 files in its last window.
- One `external/` worker read Reddit threads through reduced text, capped at about 240 characters per comment and 4.8 KB per thread.
- Several dedupe workers checked a version claim by a grep of release notes only, not by a probe.
- Twelve session logs that the old plan cites by an 8-character id (for example `2a80f39f`) are no longer in `~/.claude/projects/`; items that cite them name the id and the old-plan line.
