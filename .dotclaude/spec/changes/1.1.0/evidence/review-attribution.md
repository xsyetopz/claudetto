# Review of the Attribution Slice (P85)

A `reviewer` run did the review on 2026-10-14, read only.
The main session wrote this file from its report.
Scope: `src/plugins/dotclaude/slices/attribution/` and its lab tests.
Each failing test goes in `src/plugins/dotclaude/slices/attribution/lab/attribution.test.ts`.
`1.0.0/evidence/attribution.md` shows that with `includeGitInstructions: false` this hook is the only source of attribution.
So each input that the hook skips makes a commit or a pull request with no attribution, and no error shows.

Command for the confirmed findings:
`bun -e` imports `needsAttribution`, `attributeCommand`, `modelName`, and the kernel `parseModel`, and runs them on each input.

## Confirmed Findings

### F1: I17 and I05, an unreadable command read as "not a commit"

- `domain/shell.ts:14` and `domain/shell.ts:83` read `<<` inside double quotes as a heredoc operator.
- `domain/shell.ts:101` reads `#` as a word, so a `'` in a comment opens a quote.
- `domain/call.ts:133` reads `null` from the shell reader as "no commit".
- Output: `git commit -m "Use a << b shift"` gives `false undefined`.
- Output: `git commit -m "Fix it." # it's done` gives `false undefined`.
- Test: input `git commit -m "Use a << b shift"`, expected `git commit --trailer "<TRAILER>" -m "Use a << b shift"`, actual the input unchanged.

### F2: I17, a here-string commit gets no trailer

- `domain/shell.ts:97` fails the operator at the first `<` of `<<<`, then reads `<<"Fix it."` at the second `<` as a heredoc.
- Output: `git commit -F - <<< "Fix it."` gives `false undefined`.
- Test: input `git commit -F - <<< "Fix it."`, expected `git commit --trailer "<TRAILER>" -F - <<< "Fix it."`, actual the input unchanged.

### F3: Copy of kernel code, a second shell reader with no wrapper strip

- The header of `src/kernel/shell.ts:1` says that it is the one shell reader of dotclaude, and it calls `stripWrappers`.
- `domain/call.ts:34` skips only assignments, and `domain/call.ts:47` skips nothing before `gh`.
- Output: `env GIT_AUTHOR_NAME=x git commit -m "Fix it."` gives `false undefined`.
- Output: `sudo git commit -m "Fix it."` and `command git commit -m "Fix it."` give `false undefined`.
- Output: `GH_REPO=a/b gh pr create --body "Text."` gives `false undefined`.
- Test: input `GH_REPO=a/b gh pr create --body "Text."`, expected the footer at the end of the body, actual the input unchanged.

### F4: Copy of kernel code and I18, a model id that the kernel parses gives `Claude`

- `domain/lines.ts:14` anchors its own regex, and `src/kernel/model.ts:17` does not anchor it.
- Output: `us.anthropic.claude-sonnet-4-5-20250929-v1:0` gives `Claude` here and `{"family":"sonnet","major":4,"minor":5}` from `parseModel`.
- Output: `claude-sonnet-4-5@20250929` gives the same split.
- Test: model `us.anthropic.claude-sonnet-4-5-20250929-v1:0`, expected `Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>`, actual `Co-Authored-By: Claude <noreply@anthropic.com>`.
- Confidence: medium, because no command showed the name that Claude Code gives a Bedrock or Vertex id.

### F5: I08 and dead code, an option that `git commit` does not have

- `domain/call.ts:22` lists `--no-commit` in `NO_COMMIT`.
- Command: `git commit -h 2>&1 | grep -c -- "--no-commit"` on `git` 2.55.0.
- Output: `0`.
- Test: none, because the entry changes no result.
  The fix removes the entry.

## Unconfirmed Findings

- `domain/call.ts:18`: `--super-prefix` can be an option that recent `git` removed.
  The dotclaude guard denied the read-only check command as a destructive action, so this finding has no evidence.
  The command was `git --super-prefix x/ version 2>&1 | head -2`, followed by 3 `grep` commands.
  P88 checks why the guard matched it.
- `domain/call.ts:111` and `domain/call.ts:116`: the duplicate check compares the raw command with the unescaped line.
  So a custom line with `$` or `"` can get a second copy.
  `git` can drop the repeated trailer, so the effect is not shown.
- No test covers `-b`, a single-quoted body, or `--body=`.

## Checked With No Finding

- I01, I02, I03, I04, I06, I07, I09 apart from F3 and F4, I10, I11, I12, I13, I14, and I16.
- I15: each test asserts the command that reaches the engine, not wording.
- Test that cannot fail: none, because `seen[0]` is `undefined` when no call is recorded.
- Silent `catch`: none in the slice.
- Bound outside `limits.ts`: none, because the slice has no numeric bound.
- The `evals` names in `slice.ts:19` and `slice.ts:20` match the test names.

The run did not run `just lab`, because `tools/lab.ts` calls `claude plugin test`, and the run did not check what that command writes.
The run did not run the proposed failing tests.

Checked: the brief, the five slice files, the lab test, `external/agent-failure-dossier/00-INDEX.md`, `src/kernel/model.ts`, the head of `src/kernel/shell.ts`, `.dotclaude/spec/changes/1.0.0/evidence/attribution.md`, and `CLAUDE.md`.
The run used `bun -e` on the pure functions, `git commit -h`, and `git --version`, and compared the generated test copy with its source (only the generated header differs).
