# Sembr

This page tells how the core plugin `claudetto` puts each sentence of a Markdown file on its own line.
It also tells how the plugin puts the Title Case in each Markdown heading.
A user who writes Markdown with Claude and a contributor who edits the `sembr` slice read it.

## What the Slice Does

The slice has one `tool.call` hook with the phase `rewrite`.
The hook runs for the tools `Write`, `Edit`, and `Bash`.
It runs before the phase `check` of the `guard` slice, so the guards see the rewritten call.
The hook rewrites the input of the call before Claude Code runs the call.

| Tool | Rewrite |
| --- | --- |
| `Write` | The `content` of a file with the extension `.md` or `.mdx` |
| `Edit` | The `new_string` of an edit to a `.md` or `.mdx` file, and a repair of `old_string` |
| `Bash` | The quoted heredoc of `git commit -m` and `gh pr create --body` |

A file of another type keeps its content.
The slice has no `userConfig` key and no hook command.

## How the Hook Finds a Sentence End

The hook uses `Intl.Segmenter` with sentence granularity and the locale `und`.
These are the Unicode sentence rules (UAX 29), and they give the same result on each host.
The hook has no word list of abbreviations.
A break can follow an abbreviation, such as `e.g.`, when the segmenter finds a sentence end there.
This only moves the text to a new line, and Markdown shows the same paragraph.

The hook only adds breaks after a sentence end.
It never joins lines and it never breaks a line at a column or in a word.
A second run on the same text gives the same text.

## What the Hook Keeps

The hook does not change these parts of a file:

- A front matter block, a fenced code block, an indented code block, and a table.
- A `<pre>` block, a `<code>` block, and a `$$` math block.
- Inline code, a link, a reference link, an HTML tag, and a URL.
  A break never falls inside one of them.
- A line that ends with two spaces or a backslash, because it is a hard break.
- A reference definition, a rule line, a line that starts with `<` or `|`, and a line before a setext underline.
- A line that looks like code, such as a line with `{`, `}`, or `=`.

A list item and a quote keep their prefix on each new line, so a break stays inside the item or the quote.
A file with CRLF line endings keeps CRLF on each line that the hook writes.

## Edits That Cross a Sentence Break

Claude Code checks `old_string` before a classic hook runs, so only a hooks module can repair it.
When `old_string` is not in the file, the hook splits `old_string` into sentences.
If the split text is in the file, the hook uses it as `old_string` and splits `new_string` the same way.
If a list item or a quote holds the match, the hook takes the line prefix from the file and adds it to the new lines.
The hook repairs an edit only when exactly one place matches.

The hook rewrites `new_string` only when the edit starts and ends at line bounds of the file.
It does not rewrite an edit with `replace_all`, an empty `new_string`, or a file that it cannot read.
The split runs on the whole file after the edit, so a fence or a table around the lines stays intact.

## Commit and Pull Request Text

The hook rewrites a heredoc in a `Bash` command only in these two forms:

- `git commit -m "$(cat <<'EOF' ... EOF)"`
- `gh pr create --body "$(cat <<'EOF' ... EOF)"`

The subject line of a commit stays as written.
The last paragraph stays as written when each of its lines is a trailer, such as `Co-Authored-By: Name <mail>`.
The command stays as written when an output line would equal the delimiter, because the heredoc would end early.
It also stays when the command has more than one heredoc.

## Title Case of Headings

The hook puts each ATX heading (`#` to `######`) in Title Case, in the same pass.
The rule follows the Chicago style of the repository:

- The articles, the coordinating conjunctions, and the prepositions stay in lowercase.
  The first word, the last word, and the word after a colon get a capital letter.
- Each part of a hyphenated word gets a capital letter, such as `Add-On`.
- A code span, a link target, a tag, and a URL do not change.
- A word with a mixed case, a digit, or a dot does not change.

The heading rule does not apply inside a fence, an indented block, or the front matter.

## Off Switch

The slice has no setting to turn it off.
To remove it, remove the hook from the hooks module.
The `controls` entry of the slice says to remove it when Claude keeps one sentence on each line with no hook.

## Related Pages

- [Guard](Guard)
- [Controls](Controls)
- [Off-Switches](Off-Switches)
