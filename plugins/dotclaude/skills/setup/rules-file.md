# Project rules file

The `adherence` hooks of dotclaude enforce `.claude/dotclaude-rules.json`.
They do nothing when the file is absent.

1. Read `CLAUDE.md` one time, and write only the rules that code can check:
   - `maxLines`: a bound on the lines of a file, as `{"glob": "**/*.md", "lines": 300}`.
   - `banned`: a pattern that new text must not hold, as `{"glob": "...", "pattern": "<JavaScript regex>", "reason": "..."}`.
   - `ask`: a path that changes only when the user agrees, as `{"glob": "...", "reason": "..."}`.
1. A `glob` is relative to the project folder.
   It can use `**`, `*`, `?`, and `{a,b}`, and a `glob` with no slash matches the file name at any depth.
1. Leave out each rule that needs judgment, because code cannot check it.
1. Show the file to the user, and write it only after a yes to an `AskUserQuestion` call.
1. When `CLAUDE.md` changes, do these steps again, and show the diff against the old file.
