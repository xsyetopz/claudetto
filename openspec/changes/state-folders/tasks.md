## 1. Project State Folder

- [x] 1.1 Set `CLAUDETTO_DIR` to `.claude/claudetto` in `modules/project/domain/paths.ts`, and change the protected path in `modules/work/protect/limits.ts` to `.claude/claudetto/goal.json`. Change each test that names the old path. Check: a lab test that a handoff and a goal go to `.claude/claudetto/` fails before the change, then `just check`.
- [x] 1.2 At `session.start`, move `<project>/.claudetto/` to `.claude/claudetto/` when only the old folder exists, with `/bin/mkdir -p` and `/bin/mv` through `$.process.run`, before `next(e)`. Check: lab tests in `plugins/claudetto/tests/gitignore.test.ts` for "Old Folder Only" and "Both Folders" fail before the change, then `just lab`.
- [x] 1.3 Change the `.gitignore` entry to `/.claude/claudetto/`, and let a parent folder entry such as `.claude/` cover it. The entry is shared with `withIgnores` of `claudetto-setup --apply`, so change `tests/claudetto/setup/gitignore.test.ts` too. Check: lab tests for "Parent Folder Ignored" and "Old Entry Only" fail before the change, then `just lab`.

## 2. User State Folder

- [x] 2.1 Move the last limit reading of the status line to `${CLAUDE_CONFIG_DIR:-~/.claude}/claudetto/limits.json`, with no hash key. Check: a test in `tests/claudetto/statusline/` that the file is in the config folder and that another config folder does not read it fails before the change, then `just check`.

## 3. Repo and Docs

- [x] 3.1 Change `.gitignore`, `justfile`, `.markdownlint-cli2.jsonc`, `dev/sandbox/domain/clean.ts`, `dev/builtins.ts`, and the pages in `src/wiki/` to the new paths, and run `just generate`. Move the `.claudetto/` folder of this repo to `.claude/claudetto/`. Check: `git grep -n '\.claudetto/'` lists only the archive, the research notes, and `CHANGELOG.md` sections of older versions, then `just check`.
- [x] 3.2 Add the **BREAKING** entry and the move to the `0.4.0-alpha.1` section of `CHANGELOG.md`, and change the entry of task 20.4 to the new path. Check: `just check`.
- [x] 3.3 Get a `claudetto:Reviewer` review of the diff against this plan, and fix each defect. Check: the review lists no open defect.
