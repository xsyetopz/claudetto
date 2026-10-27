## Context

`minispec validate` has a WARNING for a requirement over 500 characters (`MAX_TEXT` in `plugins/claudetto/modules/spec/domain/validate.ts`), but no bound on the length of a file.
On 2026-10-26, 4 live `.md` files under `openspec/` are over 300 lines, all in `openspec/changes/redesign-0-4-0/research/`.

## Decisions

- **Line cap as a WARNING.** It works the same as the 500-character WARNING: `--strict` fails, and a plain `validate` passes (the user, 2026-10-26).
- **Archive skipped.** An archived change is a record, so a split would change history (the user, 2026-10-26).
- **Text rule, no word check.** Code cannot tell vague text from exact text, so the rule is in the skill and agent text, and a `claudetto:Reviewer` pass checks it (the user, 2026-10-26).

## Risks / Trade-Offs

- [Risk] A split research file breaks a link to it. -> Task 1.2 fixes each link, and `minispec validate --all --strict` runs after the split.
