# Tasks

> Mark a task done only after its check ran and passed.

## 1. Port

- [x] 1.1 Make the branch `model-switch-warning` from `main`, and cherry-pick `4439a6e3`.
  Fix each conflict in `src/`, then run `just generate`, so that `plugins/` and `wiki/` come from the source.
  Check: `just test tests/claudetto/handoff && just lab`
- [x] 1.2 Add the `CHANGELOG.md` entry under `[Unreleased]`, and the wiki text in `src/wiki/` if `Controls.md` comes from it.
  Check: `bun run lint:md`

## 2. Verify and Merge

- [x] 2.1 Run the full checks.
  Check: `just docker check`
- [ ] 2.2 Review the diff against `main`.
- [ ] 2.3 Merge the branch into `main`, and remove the worktree and the branch `worktree-agent-aa482046137065819`.
  Check: `git cherry main 4439a6e3` shows no `+` line, or the content of `adapters/switch.ts` is in `main`.
