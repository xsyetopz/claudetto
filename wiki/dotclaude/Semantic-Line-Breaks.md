# Semantic line breaks

dotclaude puts each sentence of the text that Claude writes on its own line.
The `sembr` slice does this before the call runs, so the fix costs no model token.
The code is in `src/plugins/dotclaude/slices/sembr/`.
The rationale is in [Decisions](Decisions).

## Why a program and not a rule

- A semantic line break puts each sentence on its own line.
  The rendered output does not change, and a diff shows which sentence changed.
- Claude joins sentences on one line in files and commits, although `CLAUDE.md` asks for one sentence on each line.
- A rule in prose did not hold, so a program makes the text correct.
  The `check` phase of the `guard` slice is described in [Guards](Guards).
- The hook rewrites the input of the call, and it never rewrites the file after the write.
  A rewrite after the write can make the next `Edit` fail with `File has been modified since read`.
  This is an inference from the bundle text, and it was not run.

## Where it runs

`slice.ts` declares one `tool.call` handler with the filter `Write`, `Edit`, and `Bash`.
The phase is `rewrite`, so the handler runs before the `check` phase of the `guard` slice.
`adapters/mod.ts` dispatches on the tool name.

| Tool | Rule | Function |
| --- | --- | --- |
| `Write` | Rewrites `content` of a Markdown file. | `writeInput` |
| `Edit` | Repairs `old_string` when it crosses a sentence end, and rewrites `new_string`. | `editInput`, `repairEdit`, `rewriteEdit` |
| `Bash` | Rewrites the quoted heredoc of `git commit` and `gh pr create`. | `commandInput`, `rewriteCommand` |

The rules are pure functions in `domain/rewrite.ts`.
They import only `domain/split.ts` and the kernel.

## Which files change

`isMarkdown` in `src/kernel/text.ts` checks the path.
It is true for a path that ends in `.md` or `.mdx`, in any letter case.
A file of another type passes on with no change.

## The formatter

`sembr` in `domain/split.ts` is pure string code with no import.
It only splits lines, and it never joins them.
So an existing break stays, and a second run gives the same text.

- It splits after `.`, `!`, or `?` when a space and a new sentence follow.
  The next sentence must start with a capital letter, a backtick, a quote, an opening bracket, an asterisk, or an underscore.
- It does not split after the abbreviations in the `ABBREVIATIONS` set, such as `e.g.` and `i.e.`.
  A missed split is better than a wrong split.
- It leaves unchanged the code spans, the link targets, the URLs, the fenced blocks, the `<pre>` and `<code>` blocks, and the math blocks.
  It also leaves unchanged the headings, the table rows, the link definitions, the HTML lines, and the horizontal rules.
- It keeps the list marker and the quote prefix of a split line.

## Edit

- `adapters/mod.ts` checks the file with `$.fs.exists` first.
  A file that does not exist passes on as `null`, and the `Edit` runs as written.
- `repairEdit` runs when `old_string` is not in the file as written, and its split form is in the file.
  The handler then splits both strings and calls `next`.
- `rewriteEdit` changes `new_string` only when the edit starts and ends at line bounds of the file.
  A fragment of a line, a table row, and a span of inline code stay unchanged.
  `rewriteEdit` skips an edit with `replace_all`.

## Bash

`rewriteCommand` acts only on the quoted heredoc forms:

- `git commit -m "$(cat <<'EOF'`, which changes the message.
- `gh pr create --body "$(cat <<'EOF'`, which changes the body.

For any other form (`-m "..."`, `-F`, `--body-file`, or an unquoted heredoc), the command stays unchanged.
The rewrite keeps the first line of a commit message, which is the subject.
It keeps the last paragraph when each of its lines is a trailer, such as `Co-Authored-By:`.
When an output line would equal the heredoc delimiter, the command stays unchanged.

## Failure

A rule that throws is a defect.
The handler lets the error reach Claude Code, which logs it, skips the hook, and runs the call as written.
The hook does not decide the permission, so the normal permission flow stays.
A write still asks for approval, and `gh pr create` still asks before it publishes.

The hook prints no `additionalContext` and no `systemMessage`.
So the rewrite adds no token to the model context.

## Chat

dotclaude does not rewrite the chat reply.
A probe of a `session.append` handler showed that the handler changed the stored rows and the display.
The handler also fired once for each content block of a reply.
The rewrite also changed the `result` text of `claude -p --output-format json`.

## Related pages

- [Guards](Guards)
- [Prompt-Surface](Prompt-Surface)
