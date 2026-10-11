# Semantic Line Breaks as a first-class, automated feature

Date: 2026-10-08, Claude Code 2.1.293 (`external/cc-2.1.293/strings.txt` and the `plugin-authoring` d.ts).
Labels: **confirmed** (URL or command output) and **inferred** (derived, not run).
Nothing here was run as a prototype.
File hooks apply to `.md`, `.mdx`, `.txt`, and `.rst` paths only.

## 1. The sembr.org specification

- **Confirmed** (<https://sembr.org/>, fetched 2026-10-08): the page shows no version number.
  The spec has 13 numbered rules and an RFC 2119 preamble.
- Rule 2: MUST NOT alter the rendered output.
- Rule 4: MUST break after a sentence that ends in `.`, `!`, or `?`.
- Rule 5: SHOULD break after an independent clause that ends in a comma, a semicolon mark, a colon, or an em dash.
- Rule 9: MUST NOT break inside a hyphenated word.
- Rules 6 to 8, 10, 11: MAY breaks (dependent clause, list groups, links, inline markup).
- Only rule 4 is an actionable MUST for a tool, so a tool that splits at sentence ends is conformant.
- FAQ (confirmed): a break at an em dash keeps the output only when the dash has spaces around it.
- Rendering (confirmed, FAQ): CommonMark, Markdown, AsciiDoc, and others join consecutive lines with a space.
  A forced break needs two trailing spaces or a trailing backslash, so a tool must not touch such a line.
- The site names a SemBr agent skill (`sembr/skills`, MIT).
  A skill costs model tokens, so it is not the zero-cost route.

## 2. Existing tools

| Tool | Kind | License | Last activity | Fit |
| --- | --- | --- | --- | --- |
| `markdownlint-rule-sembr` 0.2.0 (npm) | markdownlint rule, lint only | MIT | 2026-09-09 | Needs `micromark`, `sentence-splitter`, `micromark-extension-gfm`, `markdownlint-rule-helpers`. Node 22 or later. |
| `jolars/panache` | Rust formatter and linter with a `semantic` wrap mode | MIT | 2026-10-07 | Binary, not Node. Heavy for a hook. |
| `arloliu/semantic-linefeeds` (`semlf`) | Python hook for Claude Code, Codex, opencode | Apache-2.0 | 2026-08-23 | Checks and blocks the edit. A block returns text to the model, so it costs tokens. |
| `admk/sembr` | transformer line breaker, Python | MIT | 2026-06-24 | A model on CPU or GPU. Not deterministic. Too heavy. |

- Sources (confirmed): <https://registry.npmjs.org/markdownlint-rule-sembr>, <https://api.github.com/repos/jolars/panache>, `.../arloliu/semantic-linefeeds`, `.../admk/sembr`, `.../bobheadxi/readable`, `.../sembr/skills`.
- No npm package named `sembr`, `remark-semantic-linebreaks`, or `prettier-plugin-sembr` exists (confirmed: registry returned nothing).
  I found no Prettier plugin and no remark plugin.
- Accuracy on abbreviations, code, lists, tables, and links: **not measured**.
  `sentence-splitter` is a rule-based splitter with abbreviation handling (inferred from its name and role).
  `semlf` reports only two sentences on one line and treats a long line as advice (confirmed, its README).
- Dependencies: the npm rule needs four packages, so it breaks the rule "scripts in `plugins/` use only `node:` modules".
  All other tools are not Node or need a model.
- **Recommendation (inferred):** write a small deterministic formatter in plain Node (`plugins/dotclaude/lib/sembr.mjs`, about 120 lines).
  It does rule 4 only, which is the one MUST that matters.
  It splits and never joins, so an existing break is never moved and the output is idempotent.
  Use `markdownlint-rule-sembr` as a dev-only check in `just check`, if wanted, since `tools/` may use deps.

### Formatter design (inferred)

- Skip: front matter, code, HTML blocks, tables, headings, link definitions, and lines that end in a hard break.
- Protect inline code spans, link targets `](...)`, autolinks, and URLs with placeholders before the split, then restore them.
- A sentence end is `[.!?]` (and optional closing `)`, `"`, `*`, `_`) followed by a space and then an uppercase letter, a digit, a backtick, or `[`/`(`.
- No split after: `e.g.`, `i.e.`, `etc.`, `vs.`, `cf.`, `Dr.`, `Mr.`, `No.`, `approx.`, a single capital letter, or a version number such as `v2.1. 3`.
  Prefer a missed split to a wrong split.
- Keep the prefix: a new line under a list item gets the item indent, and a quote line keeps its `>` marker and the space after it.
- For commit messages, never touch the subject line, the PR title, or trailers such as `Co-Authored-By:`.

## 3. Claude Code extension points for files, commits, and PRs

### 3.1 Why a PostToolUse rewrite of a file is costly

- **Confirmed** (bundle, offset 21588916, function `Ieo`, the Write check): Write fails when the file mtime is newer than the stored read time, unless the stored read is whole and its content equals the disk content.
  Message: "File has been modified since read, either by the user or by a linter. Read it again..."
- **Confirmed** (bundle, offset 24937740, the Edit check): Edit fails by the same rule (`pw(path) > Ce.timestamp` and content differs).
- **Confirmed** (bundle, offset 24463276): Claude Code also re-reads a changed file and injects an `edited_text_file` attachment that carries a diff snippet (`t8o`, 8 lines of context) into the next request.
  Both effects are token costs.
- **Confirmed** (bundle, offset 7333169): the hook docs show `PostToolUse` with `prettier --write` as the auto-format pattern.
  It likely triggers the two costs above, because the stored read state keeps the pre-format content (inferred).
- A PostToolUse rewrite followed by Edit was **not run**.

### 3.2 Better: PreToolUse `updatedInput` (rewrite before the write)

- **Confirmed** (bundle, offset 7333109): `updatedInput` - "Modified tool input (PreToolUse only)".
- **Inferred:** a `PreToolUse` command hook on `Write` rewrites `tool_input.content`.
  The file is written once with the final text, so the stored read state equals the disk, no stale check fails, and no `edited_text_file` attachment appears.
  For `Edit`, rewrite only `new_string` (split sentences inside it), and keep `old_string` as is.
- Silence: the hook prints only `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow","updatedInput":{...}}}`, with no `additionalContext` and no `systemMessage`.
  Nothing goes to the model except the tool result it would get anyway.
  `suppressOutput` is a valid field of the hook output (confirmed, bundle schema: "Hide stdout from transcript (default: false)").
  It hides stdout in the transcript for the user and is not what keeps tokens away from the model.
  Tokens stay out because the hook adds no `additionalContext` (inferred).
- Caveat 1 (**inferred**): the model's `tool_use` block in history keeps the text it wrote.
  A later `Edit` with an `old_string` copied from memory can miss the reformatted text.
  Since the model already writes 99% correct files, the formatter is a near no-op, and the risk is small.
  Measure `old_string not found` errors before and after.
- Caveat 2 (**inferred**): `permissionDecision: "allow"` can skip the permission prompt, so test the prompt flow first.

### 3.3 Commits and PR bodies

- Claude Code writes commit messages as `git commit -m "$(cat <<'EOF' ... EOF)"` (inferred from its commit instructions, a common form).
  A `PreToolUse` hook on `Bash` with `if: "Bash(git commit *)"` and `if: "Bash(gh pr create *)"` can parse the quoted heredoc deterministically.
  Rewrite only the lines between `<<'EOF'` and the closing `EOF`, and return `updatedInput.command`.
- For any other form (`-m "..."`, `-F`, `--body-file`, an unquoted heredoc), do nothing, because rewriting shell text is fragile.
- `hooks/hooks.json` already filters `Bash(gh *)` with `if` (confirmed, file read), so the new hook adds one entry.

## 4. Chat replies

- Hook events that show assistant text (confirmed, d.ts of the skill):
  - `turn.complete` returns `{ text }`, but "a text other than a main-loop answer's is shown beneath it" (d.ts line 13228).
    So it adds text and does not replace the answer.
    It is not a way to reformat the reply.
  - `ui.message` is for a `Client` instance in a pane, not for the transcript.
  - `ui.render` draws panes, bands, and similar slots (component list in the skill).
    I found no render slot for the transcript message body.
- **Best candidate:** `session.append` (d.ts line 10501).
  It sees each row before it is stored, with `door: 'response'`, `message.type: 'assistant'`, and `origin.kind: 'model'`.
  Its text blocks are "Rewritable" and `type`, `role`, `thinking`, and `tool_use` are put back (confirmed, d.ts).
  A user-tier module is not skipped by `cc-plugin-sec-default` for `session.*` (confirmed, `mods-api.md` section 3).
- **Inferred, must be probed:**
  - Does the transcript view show the rewritten stored row, or the streamed text?
  - Does `session.append` fire once per text block or once per message, and does it fire after streaming has drawn the text?
  - Does the rewritten row change the next request prefix? (It is rewritten before the next request, so the cache prefix is stable, **inferred**.)
  The module is "early access" and may change between releases (confirmed, `mods-api.md` section 6).
  Cost to the model: zero tokens.
  The hook is a pure function of the text, with no `$.model` call.
- The hook returns `next({ ...e, message: { ...e.message, content } })` with only text blocks changed, inside the 5000 ms budget (confirmed, `mods-api.md`).
- If the display shows the streamed text, the mod fixes only the stored history, and the user still sees fused lines.
- **Measure without blocking:** a classic `Stop` hook receives `last_assistant_message` (confirmed, bundle zod schema at offset 14093370: "Text content of the last assistant message before stopping").
  The hook exits 0 with no stdout, and appends `{session, lines, multiSentenceLines}` to a JSONL file.
  Exit 0 with no output does not block and adds no tokens (inferred from the exit-code docs, which say a Stop hook blocks on exit 2 or `decision: "block"`).
  Reuse `lib/sembr.mjs` to count.
  This gives the `eval-suite` measure (`tasks.md` 18.5, "chat lines with more than one sentence").

### Prompt text and placement (if no mod can rewrite)

- Current state (confirmed): `output-styles/dotclaude.md` has no line break rule, and `compliance.md` line 38 says no correction concerns line breaks.
  The rule lives only in CLAUDE.md, which the project's prompt loads as context, far from the reply.
- Put the rule in the output style (`force-for-plugin: true`, `keep-coding-instructions: false`), in its own short block named by tag, for example `<reply_format>`.
  The output style is part of the system prompt, so it has a higher weight than CLAUDE.md context (inferred).
- Text, in STE, with the reason and one wrong and right pair:
  - "Write each sentence of a reply on its own line, because the user reads the source of the reply in diffs and logs."
  - "Break a long sentence only between clauses."
  - "Two sentences on one line is wrong. Right: one sentence, a newline, the next sentence."
- Expected result: partial, because the rule already exists in CLAUDE.md and chat still fuses 32% to 59% (inferred).

## 5. Token cost of reformatting

- PreToolUse rewrite (3.2): **zero** extra tokens when it is a no-op, which is 99% of the time (confirmed rate, `compliance.md` line 90).
  When it changes the text, the model's later `Edit` may need a re-read (inferred, small).
- PostToolUse rewrite (3.1): costs tokens.
  The next `Edit` or `Write` may fail with "File has been modified since read" and force a re-read of the file (confirmed message).
  Also an `edited_text_file` diff snippet enters the next request (confirmed code path).
- A `prompt.attachment` hook on `edited_text_file` that returns `{ text: null }` drops the snippet (not skipped by `sec-default`, confirmed in `mods-api.md`).
  It does not fix the stale check, so keep PreToolUse as the main route.

## 6. Recommendation

1. Add `lib/sembr.mjs`, a pure function `split(text, {kind})` that does only sentence splits (rule 4, rule 9, rule 2), with unit tests for abbreviations, code, lists, tables, links, and idempotence.
1. Hook it as a `PreToolUse` command hook on `Write`, `Edit`, and the commit and PR `Bash` forms, silent, with `updatedInput`.
1. Probe `session.append` on `door: 'response'` for chat. If the display uses the rewritten row, ship it. If not, ship the Stop measure and the `<reply_format>` block.
1. Add a `Stop` hook that only counts, for the eval suite.
1. Probes to run first: Edit after a PostToolUse rewrite, `updatedInput` on Write and Edit and Bash in default and auto mode, and `session.append` display.
