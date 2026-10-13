# Spec Store Choices

This page gives the source of each choice in the spec store, and the alternatives that dotclaude did not take.
It is for a reader who wants to know why the store works as it does, and for a contributor who thinks about a change to it.
Read [Spec Store States](Spec-Store-States) first.

The research is in `docs/research/spec-driven/01-sdd-sources.md`.
The works and their licenses are on [Attributions](Attributions#research-for-the-spec-store).
dotclaude cites these works and copies no text from them.
Some research claims are weak, and the research file marks them.
The states and the names of the commands are the design of dotclaude, because the research defines no states.

## Choices

| Choice | Source | Alternative not taken |
| --- | --- | --- |
| A CLI checks a gate before each state change, and an event records the evidence. | EPIC, section 4.2.1: agents declare incomplete work finished, and mechanized checks are the blockers. SDAD: gates. | A state that a model writes in a file, or that a hook moves when a turn ends. |
| `approve` stores the SHA, and `merge` needs that SHA. | SDAD: human merge authority. EPIC, section 4.2.1. | An approval with no SHA, so the merged code can differ from the reviewed code. |
| A package is `verified` only after its `verify` command exits with `0`. | EPIC, section 4.2.1. `traceSDD`, section 4.4: made-up content can pass tests, so a test alone is not enough, and a human review follows. | A package that the agent marks as done. |
| The marker `[NEEDS CLARIFICATION: ...]` blocks the move to `doing`. | EPIC, section 4.1. | Open questions in free text, with no gate. |
| A failed `verify` or a `reject` needs `fix-code` or `revise-spec`. | Piskala, section III.D. | A second try with no recorded reason. |
| Each event records the SHA and the verify result. | SDAD: provenance log. Diaz and others: evidence pack. | A log with the state only. |
| Stable `REQ-<n>` IDs, and `satisfies` in each package. | `traceSDD`: stable requirement IDs. | IDs that follow the position in a list. |
| The `plan` gate checks that each requirement is in a package. | `traceSDD` and EPIC: a requirement with no work is a gap. | A plan that nobody compares with the requirements. |
| A brief holds only the requirements of its package. | Marri: context slicing. The result is from one study. | The whole spec in the context of each agent. |
| Markdown files with front matter. | Song: a format that people and agents both read. | A YAML-only store. |
| `schema: dotclaude-spec/2` in each file. | EPIC: a declared schema name. | A schema number in a constant, with no mark in the file. |

## Phases

dotclaude has seven phases: specify, plan, implement, review, merge, accept, and archive.
The phases specify, plan, implement, and validate come from Piskala.
dotclaude did not take these parts:

- A separate `tasks` phase.
  A package has the goal, the `owns`, and the `verify` of one task, so a second list of tasks would copy the packages.
- A `validate` phase in the flow.
  `verify` and `review` do the work of the phase for each package, and `validate` stays as a read command.
- A separate path for a hotfix.
  A small fix is a `trivial` change, and it gets the one package `P1` with no `plan` step.
- A `review` state.
  Review is a phase that ends in `approved` or in a return to `doing`.

## Per-Line Citations

`traceSDD` (Panda, arXiv 2606.30689) asks the code to cite a requirement ID on each non-trivial line.
Its check then finds a cited ID that has no requirement.
dotclaude did not take this rule.

- Table 1 of the paper shows that the same requirements with no citations gave more consistent output than the cited form.
  The mean `LSS` for Claude is 0.745 uncited against 0.535 cited.
  For GLM it is 0.644 uncited against 0.510 cited.
- The cost is in Table 3.
  The orphan check needs citations, so without them the detection of a made-up `REQ` ID in code is 0%.
  With citations the detection is 86.4% for Claude and 88.0% for GLM.
- The paper tests injected errors, in Python only, so the gain of the check outside that setting is not known.
- The `traceSDD` source has no state model, so dotclaude does not take a status model from it.

dotclaude keeps the stable IDs and `satisfies`, which need no citation in the code.
The cost is that dotclaude cannot detect a made-up `REQ` ID in code.
Other gates, such as `verify` and the `review` of a diff, stand in for it.

## Not Adopted

The research ranks two more parts that dotclaude does not adopt.
These are the "Agentic Linearism" idea and the "Ambiguity Tax" formula of SDAD.
The text of the source has no data for either.

## Related Pages

- [Attributions](Attributions): the works and their licenses.
- [Spec Store](Spec-Store): the start of the guide.
