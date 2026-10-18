# Design: A Smaller `claudetto`

This file continues [`design.md`](design.md) with the audit of the code, the docs, and the lint scope.
Each pick came from Jev on 2026-10-17, unless the decision says otherwise.

## Audit Facts

- The 256 transcripts of other projects show 0 messages of `asks`, `worktree`, `minispec`, `usercheck`, and `agents`, 4 of `reads`, 34 of `turngate`, and 44 of `handoff`.
- Lines and files of each slice that a decision names (`find <slice> -name '*.ts' | xargs cat | wc -l`):

| Slice | Lines | Files |
| --- | --- | --- |
| `asks` | 4468 | 89 |
| `setup` | 3014 | 117 |
| `prompt` | 1764 | 121 |
| `guard` | 1491 | 22 |
| `attribution` | 1197 | 22 |
| `repostate` | 987 | 16 |
| `worktree` | 432 | 14 |
| `surface` | 239 | 12 |
| `corrections` | 175 | 6 |
| `trim` | 92 | 2 |

- `wiki/` has 117 pages.
  33 of them are generated from `src/wiki/`, and 84 are edited by hand, with 41 pages in `wiki/archive/`.
- `docs/` has 21 files: `docs/README.md` and `docs/research/`.
- `biome.json` lints `plugins/**/*.ts` with the generated files.
  `.markdownlint-cli2.jsonc` ignores `src/**`, so markdownlint checks only the generated copy of each Markdown source.

## Decisions

### D12. Remove Each Slice That a Built-in Does, and Shrink Each Slice That a Rule Can Do

- Remove `worktree`, at confidence 0.94.
  Its `WorktreeCreate` hook replaces the creation of Claude Code, so `worktree.baseRef: "head"` of the snippet (D11) has no effect while the hook is on.
  The built-in `.worktreeinclude` copies the git-ignored files.
- Remove `attribution`, at confidence 0.83, and the user agreed on 2026-10-17 ("remove it!").
  The `attribution` setting of Claude Code writes the commit and pull request lines.
  The `commit-msg` hook of `/claudetto:setup` (`slices/setup/domain/commit-hook.ts`), the deny of its bypass, and the check of the pull request body go with it.
  `includeGitInstructions` stays `false`, because `repostate` gives the git state.
- Keep `repostate`, because no built-in checks a changelog section or a package name.
- Keep `sembr`, because `.markdownlint.jsonc` sets `MD013` to `false`, and no lint checks semantic line breaks.
  Its row in `Controls.md` (D27) gives the incident and the expiry.
- Remove `corrections`, at confidence 0.92.
  `CLAUDE.md`, `.claude/rules/`, and auto memory load a correction with no cost on each prompt.
- Shrink `asks`, at confidence 0.97.
  Each ask that a path or a command prefix can express goes to a `permissions.ask` rule of the snippet.
  A hook stays only for the content checks, such as a new skip marker or a new lint suppression.
- Shrink `guard`, at confidence 0.89.
  Each deny that a `permissions.deny` rule can express goes to the snippet.
  The deny of a `Bash` command that only prints a file goes, because the auto mode text of Claude Code tells the model to read files with `cat`, `head`, and `sed -n`.
- Keep `trim`, `surface`, and `prompt` as three slices.
  Jev picked `keep-separate` at confidence 0.46, which is not sure, so the facts decide.
  The rewrite of D17 needs one owner for the data of each model, and a module in `src/kernel/` gives that with no move of the three slices.
  A merge is easy to do later, and a split of a merged slice is not.
- Merge the small files of `setup` that hold one concern into one file, and put its fixed texts in `prompts/`.
  Jev picked `consolidate` at confidence 0.06, which is not sure, so the facts decide.
  117 files of 26 lines on average add one import for each file, and the 300-line bound still holds a file of one concern.

- Alternative: one `context` slice for `trim`, `surface`, and `prompt`.
  Rejected for now, by the reason above.

### D13. One Source for the Docs, and Lint at the Source

- `src/wiki/` is the one source of the wiki, at confidence 0.98.
  Each of the 84 hand-edited pages moves to `src/wiki/`, and `just generate` writes all of `wiki/`.
  Each page of `wiki/archive/` goes, because git keeps the history.
- `docs/research/` goes.
  Each fact in it that a decision cites moves to a page of `src/wiki/evidence/`, and `docs/README.md` keeps the link to the wiki.
- Each wiki page is at most 150 lines, with no narrative.
- Lint and format the source only, at confidence 0.85.
  `biome.json` and `.markdownlint-cli2.jsonc` skip `plugins/` and `wiki/`, and markdownlint checks `src/**/*.md`.
  `just generate` formats its output with Biome, so `just generate --check` proves that each shipped file is formatted.

- Alternative: lint `src/` and `plugins/`.
  Rejected, because each error is reported twice, once in a file that no one may edit.
