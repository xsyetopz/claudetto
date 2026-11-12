# AGENTS.md

- `just check` runs lint, the type check, tests, validation, and the hook labs.
- Write no internal note in source: no decision or task ID such as `D27` or `2.1`, no path into `openspec/` or a plan, no history. The source is public, and the reasons live in `openspec/`.
- Read Claude docs and schemas through `clawdipedia-docs` or their URL, and keep no copy of them in the repo or in a cache.
- Never patch the Claude Code CLI binary or its npm package, although it is minified JavaScript that you can read.
- Run a paid model call or eval by asking first, and report its cost and the weekly share after the run.
- Count, price, and look up only `claude-opus-5-5`, `claude-sonnet-5-5`, and `claude-haiku-5-5`, beside `claude-fable-5-2` and `claude-mythos-5-2` for the `sweep` agent, because they are the models this account runs. Measure the weekly limit in tokens.
- Stop a process only by the pid its launcher recorded, with `kill <pid>`. Never use `pkill` or `killall` with a pattern, because a pattern also matches the user's own processes.
- The backticks show a reader, a person or a model, which words are code and which words are prose.
- Write prompts using the `Claude Opus 5.5` and general prompting best-practices from `clawdipedia-docs`: give clear, direct instructions, explain the reason for each rule, and tell `Claude` **what to do** rather than **what to avoid**.

## Fuck Around and Find Out

Work by FAFO. Before you state a fact about Claude Code, a setting, a tool, or a prompt, write a hypothesis, predict what one check will show, run the check, and let its result decide. Run the check where undoing is free: `/tmp/probe-*`, a fake Messages API, `--debug-file`, `--no-session-persistence`, or a worktree. Measure what can be measured, by legal means, before you mark a row unchecked or ask the user. Record the hypothesis, the prediction, the command, and the result beside the finding, and call a claim with no run a hypothesis.

Before you call a built-in text or behavior fixed, look for an override and test it: a same-named agent, skill, command, or output style, a setting, an env var, a hidden flag, or a hook that rewrites the input.

## One Obvious Way

Give each job one way to be done, and make it the obvious one. When a maintained tool or list already does the job, use it and delete our copy. Ship one path per job, and make it the only one.

Build each rebuild from a clean slate. When a new path replaces an old one, delete the old path along with its tests, settings, and docs, so the new path stands alone. Treat a required tool as required: when it is missing, stop with an error that names the step that installs it.

## Articles

Write the root prompt, tool and agent descriptions, and hook texts in block language, the instruction register of labels, notices, and recipes (Quirk et al. 1985, pp. 845–46 and 900). Drop "the" before a noun whose referent the reader already holds, such as user, repository, project, or code: "Read code before you describe or change it." Keep each article that does work:

- Keep "a" or "an" where it means any one, as in "write a failing test". Dropping "a" costs a model more accuracy than dropping "the" (arXiv 2505.00019).
- Keep the article before a noun that also reads as a verb (check, run, change, test, fix, call, request, report, rest), so the phrase parses one way.
- Keep the article where dropping it makes a garden path, as in "the scope the user set".
- In a series, write the article once, before the first item: "a remark, brainstorm, or pasted material" (ASD-STE100).

Replies to the user, docs, and the changelog keep full articles.

## Duplication

Call `mcp__jscpd__check_duplication` with each function or block before you write it, and reuse the code it finds. Call `mcp__jscpd__get_file_clones` before you refactor a file, and `mcp__jscpd__check_current_directory` after you edit files.

<!-- bedrock -->
- Run each task through `just`. `just` lists the recipes. Check each change with the narrowest one, such as `just rust::test` or `just lint`, and run `just verify` once before you finish a change that alters behavior.
- Fix the cause of each lint, type, or guard error in the code. Keep the shared configs as they are; the bedrock that wrote them owns them.
- Put project recipes in `project.just`. The `justfile` and `.just/` are shared and get replaced on the next adopt. A recipe there named `project-<task>`, such as `project-verify` or `project-test`, runs after the languages' `<task>`, so a project extends `just verify` there. `project-pre-typecheck` runs before the TypeScript type check, for a build the types import.
- Write commit messages as Conventional Commits; the commit-msg hook checks them.
- When a recipe reports a missing tool, run `just setup`, which installs the pinned ones. Install any it can't, such as `just`, Bun, rustup, or Xcode, with the system's package manager, then rerun the recipe. Tell the user what you installed, and keep the check instead of skipping it.
<!-- /bedrock -->

<!-- typescript-bedrock -->
- Install with `bun install`, and run one-off tools with `bunx`.
- Check each change with the narrowest command: `bun test <file>`, `bun check`, `bun run lint`, or `bun fmt`.
- Fix the cause of each lint or type error in the code, and keep the lint and `tsconfig` settings as they are.
- Pin each dependency version once, in `workspaces.catalog`, and reference it as `catalog:`.
- Give a JSDoc comment to each declaration a package exports from its `exports`, `main`, or `module` entry; internal code needs none.
- Use Bun APIs where Bun has one, such as `Bun.file`, `Bun.$`, and `Bun.spawn`.
- Change shared lint, type, and Markdown rules in `typescript-bedrock`, which the repo configs extend.
<!-- /typescript-bedrock -->
