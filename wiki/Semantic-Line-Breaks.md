# Semantic line breaks

dotclaude puts each sentence of the text that Claude writes on its own line.
The fix runs before the text is written, and it costs no model token.
The decision is D29 in [Decisions](Decisions-Evidence).
The source study is `research/sembr.md`.

## Why

- A semantic line break puts a new sentence on a new line.
  The rendered output does not change, and a diff shows which sentence changed.
- Claude fuses sentences on one line in files, commits, and chat, although `CLAUDE.md` forbids it.
- A rule in prose did not hold, so a program fixes the text ([Compliance](Decisions-Prompt#d28-compliance-by-checks-not-by-prose)).
- No rewrite runs after a write.
  A rewrite of a file after the write can make the next `Edit` fail with "File has been modified since read" (**inferred** from bundle text, not run).
  So the auto-fix table has no row for line breaks ([Auto-fix](Auto-Fix)).

## The formatter

`plugins/dotclaude/lib/sembr.mjs` is pure string code with no import.

- It breaks a line only after a sentence end (`.`, `!`, or `?`) that a space and a new sentence follow.
- It never joins lines.
  An existing break stays, and a second run gives the same text.
- It leaves these unchanged: code fences, inline code, link targets, URLs, tables, headings, front matter, link definitions, and a line that ends in a hard break.
- It does not split after `e.g.`, `i.e.`, `etc.`, `vs.`, a single capital letter, or a version number.
  A missed split is better than a wrong split.
- It keeps the list indent and the quote prefix of a split line.

## Hooks

| Hook | What it does |
| --- | --- |
| `PreToolUse` on `Write` and `Edit` of a `.md` or `.mdx` path | Rewrites the text through `updatedInput`. |
| `tool.call` on `Edit` in the hooks module | Repairs an `old_string` that spans two sentences. |
| `PreToolUse` on `Bash` for `git commit` and `gh pr create` | Rewrites the quoted heredoc text. |
| `Stop` | Counts the chat lines with more than one sentence. |

The entry for the classic hooks is `features/sembr/cli.mjs`.
The rules are in `features/sembr/rules.mjs`.

### Silent rewrite before a write

- For `Edit`, the hook changes `new_string` only, and keeps `old_string` as it is.
  It changes `new_string` only when `new_string` starts and ends at line bounds of the file.
  A fragment of a line, a table row, and an inline-code span stay unchanged.
- The hook prints no `additionalContext` and no `systemMessage`, so no token goes to the model.
- The hook sets no `permissionDecision`, so the normal permission flow stays.
  A write still prompts, and `gh pr create` still asks before it publishes.
- The hook does nothing for another file type, and nothing when the text needs no change.
- Claude Code checks `old_string` before a classic hook runs.
  The `tool.call` handler therefore repairs a cross-sentence `old_string`.
  When the `old_string` is not in the file and its split form is, the handler splits both strings and calls `next`.

### Commit and pull request text

- The hook rewrites the message of `git commit` and the body of `gh pr create` only in the quoted heredoc form (`<<'EOF'`).
- It never changes the subject line, the title, or a trailer such as `Co-Authored-By:`.
- For any other form (`-m "..."`, `-F`, `--body-file`, or an unquoted heredoc), it does nothing.
- When any output line would equal the heredoc delimiter, it returns the command unchanged.

## Chat

- The `Stop` hook counts the lines of `last_assistant_message` that have more than one sentence.
  It appends the counts to a log for the eval, exits 0 with no output, and never blocks.
- The output style has a `<reply_format>` block.
  It gives the reason (the user reads the source of a reply in diffs and logs), one wrong example, and one right example.
- dotclaude does not rewrite the chat reply.
  Probe 2.31 showed that a `session.append` handler changes the display and the stored row, and that the hook fires once for each content block.
  The next turn read about 200 fewer cached tokens in one run, and the rewrite also changed the `result` text of `claude -p --output-format json`.
  For these reasons, the user removed the handler from 0.28.0.

## Probes first

Three probes ran before the hooks shipped:

1. A later `Edit` whose `old_string` comes from the unwrapped text after a rewrite.
1. `updatedInput` in auto mode, and the normal permission flow when the hook sets no `permissionDecision`.
1. `session.append` with door `response` on the chat display.

A failed probe changes the route.
It does not turn into a workaround.

## Related pages

- [Auto-fix](Auto-Fix)
- [Claude mods](Claude-Mods)
- [Development](Development)
