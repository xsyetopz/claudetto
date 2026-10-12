# P15 page run

The rules of one run that writes one wiki page for P15 ([package](15-docs.md)).
A run has a limit of about 60 turns.
Runs that read for too long wrote no page, so keep to the turn budget.

## Setup (2 turns)

1. `git checkout -b p15-page-<Page> <base>`, with the base commit of the brief.
   The worktree can start on an old commit.
2. `ln -s /Users/krystian/CodeProjects/xsyetopz/dotclaude/node_modules node_modules`.
   Git does not ignore this link, so never use `git add -A` or `git commit -a`.
   Add only the paths of your page.

Do not run `bun install`, `just check`, or `just lab`.
The main session runs them after the merge.

## Budget

- Turns 1 to 30: read.
  Use `grep` and line ranges.
  Do not read a whole large file, and never print a file under `external/` whole (`strings.txt` is 59 MB).
- By turn 40: the page is written and committed as `dotclaude 1.0.0: P15 <Page>`.
- Then: `bun run lint:md` and `bun test tests/support/wiki-links.test.ts`.
  Fix what they find in your page, and commit again.
  If your page has a source in `src/wiki/`, run `just generate` and commit the generated page too.
- If a turn notice says that you are near the limit, commit what you have and report.

## Content

- Write the page new, from the code and the evidence.
  You can read the old text for its structure, but check each claim before you keep it.
  Remove each stale claim.
  Drop 0.x history.
- A page answers: what it does, how it works with code paths, the bounds by name, value, and file, and why, with a link to the decision in `Decisions` or its group pages when one exists.
- Give a number only with a source.
- Mark inference as inference.
- Facts about the Claude Code binary: see "Decisions" in [the package](15-docs.md).
  Name the version `2.1.296` and how the fact was found, in your own words, with no bundle code and no long verbatim prompt text.
  The extracts are in the main checkout under `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/`, because the worktree has no `external/`.
- At most 300 lines.
- Link pages by name only, with no folder.
  Each page of the map exists.
  Link a section anchor only if it exists now.
- Docs style: STE-flavored ASD-STE100, no semicolons, one sentence on each line, code items in inline code.
- Change only the files of the brief.
  If you merge an old page into yours, delete the old page and its `src/wiki/` source.
  Then repoint each link to the old page in any file, which is the one edit allowed outside your page.

## Report

At most 15 lines: the commits, the check results, and each claim that you could not settle.
