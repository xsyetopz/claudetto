# Review of the Sembr Slice (P92)

A `reviewer` run did the review on 2026-10-14, read only.
The main session wrote this file from its report.
The scope is `src/plugins/dotclaude/slices/sembr/` and `tests/dotclaude/sembr/`.
The run read the dossier `external/agent-failure-dossier/00-INDEX.md` and I18 in `07-measurement-and-environment.md`.
The fix package is P118.

## Confirmed Findings

### 1. I18: the repair of `old_string` fails on a list item or a quote line

- File: `src/plugins/dotclaude/slices/sembr/domain/rewrite.ts:79`.
- `repairEdit` splits `old_string` without the line context.
  `sembr` adds a continuation prefix to the file, such as 2 spaces under a `-` list item, or `>` and a space in a quote.
  So the split `old_string` does not match the file.
  The `Edit` then fails, which is the case that SL 57677e27 describes (I18, "A hook broke a built-in tool").
- Command, run from the repository root:

```sh
bun -e 'import { repairEdit } from "./src/plugins/dotclaude/slices/sembr/domain/rewrite.ts";
import { sembr } from "./src/plugins/dotclaude/slices/sembr/domain/split.ts";
const f = sembr("- Item one. Item two.\n");
console.log(JSON.stringify(f), repairEdit(f, "Item one. Item two.", "x"));'
```

- Output:

```text
"- Item one.\n  Item two.\n" undefined
```

- The same gap shows for `> One here. Two here.` and for `1. First one. Second one.`.
  The output is `undefined` for each of them.
  A plain line repairs correctly.
- Failing test, in `tests/dotclaude/sembr/hooks.test.ts`:
  - Input: `file` is `"- Item one.\n  Item two.\n"` and `old_string` is `"Item one. Item two."`.
  - Expected: the `old_string` result is `"Item one.\n  Item two."`.
    For the quote case, the expected `old_string` is `"One here.\n> Two here."`.
  - Actual: `undefined`.
- Severity: should-fix.
  Confidence: high.

### 2. I18: a CRLF file loses the front matter guard and gets mixed line endings

- File: `src/plugins/dotclaude/slices/sembr/domain/split.ts:117` and `:189`.
- `protectedLines` compares the first line with `"---"`, so `"---\r"` does not open the front matter.
- `format` splits on `"\n"` only, so a split line gets `\n` and the last part keeps `\r\n`.
- Command:

```sh
bun -e 'import { sembr } from "./src/plugins/dotclaude/slices/sembr/domain/split.ts";
console.log(JSON.stringify(sembr("---\r\ntitle: Fix it. Then go\r\nid: x\r\n---\r\n")));'
```

- Output:

```text
"---\r\ntitle: Fix it.\nThen go\r\nid: x\r\n---\r\n"
```

- The YAML value breaks.
  The same text with `\n` stays unchanged.
- Failing test, in `tests/dotclaude/sembr/split.test.ts`:
  - Input: `"---\r\ntitle: Fix it. Then go\r\nid: x\r\n---\r\n"`.
  - Expected: the same text.
  - Actual: `"---\r\ntitle: Fix it.\nThen go\r\nid: x\r\n---\r\n"`.
- Severity: should-fix.
  Confidence: medium.
  No live session shows that a `Write` gets CRLF content.

## Unconfirmed Findings

- I18: `repairEdit` and `rewriteEdit` compare text that has `\n` with `file`.
  If `$.fs.read` returns a CRLF file, a multi-line `old_string` never repairs.
  No command shows what `$.fs.read` returns for a CRLF file.
- Smell "test that cannot fail": the lab tests that pass on unchanged input, such as "a missing file passes on unchanged" at `src/plugins/dotclaude/slices/sembr/lab/sembr.test.ts:79`, also pass when the hook throws.
  The reason is that Claude Code skips a hook that throws and runs the call as written (`adapters/mod.ts:7`).
  The run did not run the lab, so it is not shown that the lab engine has the same behavior.
- Smell "dead code": `src/plugins/dotclaude/slices/sembr/adapters/mod.ts:25` checks `e.tool !== "Edit"` after the filter and the two checks before it.
  No command shows that the branch is unreachable.
  Severity: nit.

## Checked With No Finding

- I01 to I17: no finding.
  I01, I03, I04, I06, I11, I12, I13, I16, and I17 do not apply to a pure rewrite hook.
  For I02, the rule is a hook and not a prompt rule.
  For I05, no assertion is weaker, no test is skipped, and the slice has no `catch`.
  For I07, the full rewrite of a `Write` is design D29.
  For I08, `isMarkdown` exists in `src/kernel/text.ts:14`.
  For I09, the slice does not copy kernel code.
  For I10, the `Bash` rewrite changes only a quoted heredoc and refuses a delimiter line.
  For I14, the slice changes no bound.
  For I15, no test asserts prose.
- Smells with no finding: a copy of kernel code, a bound outside `limits.ts`, a silent `catch`, a tool error read as a negative, and a test of prose.
  The numeric literals in `split.ts` are CommonMark syntax, not runtime bounds.

Checked: `CLAUDE.md`, `.claude/rules/*.md`, the brief, the slice sources, the 4 test files, and the lab test.
`just test tests/dotclaude/sembr/` gave 46 pass and 0 fail.
The run did not run `just lab`, because `tools/lab.ts` uses `tools/telemetry.ts`, and the run did not check whether that file writes data.
