# Tasks

## 1. Claude Code 2.1.303 (Part 2)

- [ ] 1.1 Draft the architecture and runtime pages of W2: `Claude-Code` to `Claude-Code-Sessions-And-Storage`, plus `Claude-Code-CLI`, `Claude-Code-Env-Vars`.
- [ ] 1.2 Draft the extension pages of W2: settings, permissions, hooks, memory, output styles, status line, tools, subagents, skills, plugins, Mod API, MCP.
- [ ] 1.3 Review a sample of facts of each page against the bundle and the docs, and fix each error.
- [ ] 1.4 Write `Claude-Code-Undocumented`, move the drafts to `src/wiki/claude-code/`, remove the old `wiki/claude-code/` pages.
  Check: `just generate && bun run lint:md && bun test tests/support/wiki-links.test.ts`

## 2. claudetto 0.2.0+ (Part 1)

- [x] 2.1 Move each hand-edited page of `wiki/` to `src/wiki/claudetto/`, keep only pages that are true for 0.2.0, and give one page to each slice and add-on (`release-0-2-0` 10.4).
- [x] 2.2 Move each cited fact of `docs/research/` and `wiki/archive/` that a page still needs to an evidence page, then remove both folders.
- [x] 2.3 Remove each mention of `dotclaude` (`release-0-2-0` 2.3).
  Check: `! git grep -qi dotclaude -- ':!openspec' ':!CHANGELOG.md'`
- [ ] 2.4 Write `Home.md` and `_Sidebar.md` for the two parts.
  Check: `just docker check`
- [ ] 2.5 Ask the user before `just wiki`, because it pushes to the public wiki.
