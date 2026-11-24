# Agents

<!-- bedrock -->
- Run each task through `just`. `just` lists the recipes. Check each change with the narrowest one, such as `just rust::test` or `just lint`, and run `just verify` once before you finish a change that alters behavior.
- Fix the cause of each lint, type, or guard error in the code. Keep the shared configs as they are; the bedrock that wrote them owns them.
- Put project recipes in `project.just`. The `justfile` and `.just/` are shared and get replaced on the next adopt. A recipe there named `project-<task>`, such as `project-verify` or `project-test`, runs after the languages' `<task>`, so a project extends `just verify` there. `project-pre-typecheck` runs before the TypeScript type check, for a build the types import.
- Write commit messages as Conventional Commits; the commit-msg hook checks them.
- When a recipe reports a missing tool, run `just setup`, which installs the pinned ones. Install any it can't, such as `just`, Bun, rustup, or Xcode, with the system's package manager, then rerun the recipe. Tell the user what you installed, and keep the check instead of skipping it.
<!-- /bedrock -->

<!-- typescript-bedrock -->
- Install with `bun install`, and run one-off tools with `bunx`.
- Check each change with the narrowest command: `bun test <file>`, `bun check`, `just typescript::lint <path>`, or `bun fmt`. A lint run starts type-aware tsgolint, which holds the whole program in memory, so run it through `just` (one run on the machine at a time) and not as a bare `bunx oxlint`.
- Fix the cause of each lint or type error in the code, and keep the lint and `tsconfig` settings as they are.
- Pin each dependency version once, in `workspaces.catalog`, and reference it as `catalog:`.
- Give a JSDoc comment to each declaration a package exports from its `exports`, `main`, or `module` entry; internal code needs none.
- Use Bun APIs where Bun has one, such as `Bun.file`, `Bun.$`, and `Bun.spawn`.
- Change the shared lint, type, and Markdown rules in bedrock's `templates/typescript`; this repo's configs are copies that `bedrock update` rewrites.
<!-- /typescript-bedrock -->

- A lint or type check that stops on a missing `.claude-plugin/types` file needs the generated plugin types: run `just project-types`, then rerun the same check before you report or commit.
