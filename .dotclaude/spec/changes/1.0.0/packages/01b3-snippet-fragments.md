---
id: P01b3
deps: [P01b2]
owns: ["tools/generate/emit/snippet.ts", "src/shared/", "src/fragments/"]
verify: just test tests/tools && just check
agent: implementer
---

# P01b3 The settings snippet and the fragments

## Goal

Make the generator write the settings snippet from the `settings` entries of the slices, and move the shared texts of `src/shared/` to `src/fragments/`.

## Context

- Your worktree has no git-ignored file.
  Before a check, run `bun install` in the worktree, and copy each git-ignored types folder of the main checkout `/Users/krystian/CodeProjects/xsyetopz/dotclaude` to the same path in the worktree: `.claude-plugin/types/` and `plugins/*/.claude-plugin/types/`.
  The type check reads them.
- The rules of the snippet: `spec/changes/1.0.0/workflow.md:127-133`.
- The property order: `schemas/claude-code-settings.json`.
- The 0.28.0 snippet: `src/shared/snippet.json` and `src/shared/docs-snippet.json`.
  The 0.28.0 text step (`tools/generate/emit/texts.ts`) puts them in `plugins/dotclaude/lib/snippets.ts` through `src/plugins/dotclaude/lib/snippets.ts/`, and fills `{{include NAME}}` lines from `src/shared/`.
- The slice contract: `settings` in `src/kernel/slice.ts`.
- The entry of the generator: `tools/generate/index.ts`.

## Steps

1. Write `tools/generate/emit/snippet.ts`: the keys in the property order of the schema, the keys of `env` in alphabetical order, and a failure that names both slices when two slices set one key to different values.
   Add its call to `tools/generate/index.ts`.
2. Move the entries of `src/shared/snippet.json` to the `settings` of `src/plugins/dotclaude/plugin.ts` or of the `prompt` slice, by the slice that needs each key.
   Keep the 0.28.0 consumers of the snippet working: the output of `plugins/dotclaude/lib/snippets.ts` changes only in the order of its keys.
3. Move the texts of `src/shared/` to `src/fragments/`, change the include path of the text step, and delete `src/shared/`.
4. Add tests in `tests/tools/generate/` on fixture slices: the schema order, the order of `env`, and the failure on two values for one key.
5. Run `just generate` and `just check`.

## Acceptance

- `just test tests/tools` and `just check` pass.
- `src/shared/` does not exist, and `grep -rn "src/shared" tools tests src` finds nothing.
- Each file has 300 lines or less, and each test file has 500 lines or less.

## Boundaries

- Change only the paths of `owns`, the one call in `tools/generate/index.ts`, the include path in `tools/generate/emit/texts.ts`, the `settings` entries of step 2, and `tests/tools/generate/`.
- Do not change a value of the snippet, only the order of its keys.
- Commit on the branch of your worktree after each step that passes its tests, with the subject `dotclaude 1.0.0: P01b3 <summary>`.
  Before you reach your turn bound, report the steps that are done and the steps that are open.
