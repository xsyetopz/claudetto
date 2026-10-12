---
id: P22
deps: [P01c]
owns: ["src/plugins/dotclaude/slices/styles/", "tests/dotclaude/styles/"]
verify: just validate && just check
agent: implementer
---

# P22 `styles`

## Goal

Write the output style `dotclaude:Concise`, based on the built-in `Concise` style of Claude Code 2.1.296, and make it the `outputStyle` of the settings snippet.
It replaces the 0.28.0 output style `dotclaude`.

## Context

- Your worktree has no git-ignored file.
  Before a check, run `bun install` in the worktree, and copy each git-ignored types folder of the main checkout `/Users/krystian/CodeProjects/xsyetopz/dotclaude` to the same path in the worktree: `.claude-plugin/types/` and `plugins/*/.claude-plugin/types/`.
  The type check reads them.
  `external/` is git-ignored too, so read it in the main checkout.
- The rules of the wave: `spec/changes/1.0.0/packages.md:7-15`, and this package: `packages.md:95-97`.
- The decision of the user: `spec/changes/1.0.0/change.md:38`, and the setting: `spec/changes/1.0.0/workflow.md:133`.
- The files: `spec/changes/1.0.0/tree.md:117-119`.
- The slice contract: `src/kernel/slice.ts` (the fields `outputStyles` and `settings`), and the generator copies `styles/` to `output-styles/` (`tools/generate/emit/slices.ts:2,56`).
- The built-in text: `external/cc-extract/2.1.296/style/Concise.txt` (265 tokens), which `spec/changes/1.0.0/evidence/extract.md:137` marks as not confirmed, because no capture had an output style (`extract.md:217`).
- An output style without `keepCodingInstructions` sets the section `doing_tasks` to `null` (`extract.md:154`).
- The 0.28.0 style: `src/plugins/dotclaude/output-styles/dotclaude.md` (22 lines).
- The rebuild list: `tools/rebuild-pending.txt:121-123`.

## Steps

1. Confirm the built-in text: run one session in `just sandbox` (read `wiki/plugins/Sandbox.md` first) with the built-in `Concise` style, capture its system prompt with `dotclaude-capture`, and compare it with `Concise.txt`.
   Record the result in `spec/changes/1.0.0/evidence/extract.md`, in the row of `Concise`.
   When the sandbox cannot run in your environment, stop, and report it, because the text must not come from an unconfirmed extract.
2. Write `slice.ts` and `styles/Concise.md`: the built-in text, with the parts of the 0.28.0 style that the built-in text does not have, and with the choice of `keepCodingInstructions` that keeps the facts that the model needs.
   Give the reason for that choice in your report.
3. Set `outputStyle` to `dotclaude:Concise` in the settings of `styles/slice.ts`.
4. Remove the 0.28.0 style and its lines in `tools/rebuild-pending.txt`.
5. Run `just generate`, `just validate`, and `just check`.

## Acceptance

- `just validate` and `just check` pass.
- `plugins/dotclaude/output-styles/Concise.md` exists, and the generated settings snippet has `"outputStyle": "dotclaude:Concise"`.
- The row of `Concise` in `extract.md` says confirmed, with the capture that confirms it.
- The main session sends the text to a `reviewer` after the merge.

## Boundaries

- Change only the paths of `owns`, the 0.28.0 paths of `tools/rebuild-pending.txt:121-123` and those lines, and the row of `Concise` in `spec/changes/1.0.0/evidence/extract.md`.
- Do not change the settings of `prompt/slice.ts`.
- Write the style in strict ASD-STE100, with semantic line breaks, and with no forceful words.
- Write no test of the style text, because a test of the words of a prompt breaks on a change of words and not on a defect.
- Run `just generate`, and commit the generated `plugins/` with your work.
- Commit on the branch of your worktree after each step that passes its checks, with the subject `dotclaude 1.0.0: P22 <summary>`.
  Before you reach your turn bound, report the steps that are done and the steps that are open.
