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
  A rewrite of a file after the write can make the next `Edit` fail with "File has been modified since read" (**inference** from bundle text, not run).
  So no hook rewrites a file after it is written.

## The formatter

`plugins/dotclaude/lib/sembr.ts` is pure string code with no import.

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
| `tool.call` on `Write` of a `.md` or `.mdx` path | Rewrites `content`. |
| `tool.call` on `Edit` of a `.md` or `.mdx` path | Repairs an `old_string` that spans two sentences, and then rewrites `new_string`. |
| `tool.call` on `Bash` | Rewrites the quoted heredoc text of `git commit` and `gh pr create`. |

All three handlers are in the hooks module `hooks/register.ts`, and no classic hook is left.
The rules are in `features/sembr/rules.ts`.
Each handler fails open: when a rule throws, or when the file cannot be read, the call goes on as written.

### Silent rewrite before a write

- For `Edit`, the hook keeps `old_string` as it is, unless it repairs a cross-sentence `old_string` (see below), and it rewrites `new_string`.
  It changes `new_string` only when `new_string` starts and ends at line bounds of the file.
  A fragment of a line, a table row, and an inline-code span stay unchanged.
- The hook prints no `additionalContext` and no `systemMessage`, so no token goes to the model.
- The hook does not decide a permission, so the normal permission flow stays.
  A write still prompts, and `gh pr create` still asks before it publishes.
- The hook does nothing for another file type, and nothing when the text needs no change.
- Claude Code checks `old_string` before a classic hook runs.
  Only a `tool.call` handler can therefore repair a cross-sentence `old_string`, and this is why all of `sembr` is in the module.
  When the `old_string` is not in the file and its split form is, the handler splits both strings and calls `next`.

### Commit and pull request text

- The hook rewrites the message of `git commit` and the body of `gh pr create` only in the quoted heredoc form (`<<'EOF'`).
- It never changes the subject line, the title, or a trailer such as `Co-Authored-By:`.
- For any other form (`-m "..."`, `-F`, `--body-file`, or an unquoted heredoc), it does nothing.
- When any output line would equal the heredoc delimiter, it returns the command unchanged.

## Chat

- No hook counts or logs the chat lines.
  The `Stop` count and its log `sembr-chat.jsonl` are removed, because a log that only an eval read is a made-up format (design D35).
- The output style has a `<text_format>` block.
  It tells Claude to write each code item in single backticks and to start each sentence on a new line.
- dotclaude does not rewrite the chat reply.
  Probe 2.31 showed that a `session.append` handler changes the display and the stored row, and that the hook fires once for each content block.
  The next turn read about 200 fewer cached tokens in one run, and the rewrite also changed the `result` text of `claude -p --output-format json`.
  For these reasons, the user removed the handler from 0.28.0.

## Probes first

Three probes ran before the hooks shipped:

1. A later `Edit` whose `old_string` comes from the unwrapped text after a rewrite.
2. `updatedInput` in auto mode, and the normal permission flow when the hook sets no `permissionDecision`.
3. `session.append` with door `response` on the chat display.

A failed probe changes the route.
It does not turn into a workaround.

## Related pages

- [Claude mods](Claude-Mods)
- [Development](Development)
