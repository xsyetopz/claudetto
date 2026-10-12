# Archive: 0.27 and 0.28 text

This page keeps the text that described behavior of the 0.27 and 0.28 releases.
Current pages do not describe these parts.
The [Release History](Release-History) page has the notes of each older release.

## The 0.27 and 0.28 rebuilds

0.27.0 rebuilt the core plugin from an empty tree and removed most 0.26 parts.
0.28.0 removed the setup profile with its diff and backups, the router table, the usage state file, the handoff notes, and the `dotclaude-modder` plugin.
The settings snippet replaced the setup profile.

## Update notes for 0.28.0

- Files that 0.27.0 wrote stay on your machine, such as the stub `statusline.mjs` and the `<file>.dotclaude-backup-<time>` files.
- The `statusLine` command of 0.27.0 runs the stub, which shows nothing.
  Replace the command with the path of the installed plugin folder, and delete the stub and the backups by hand.

## Usage notes

- The setup profile of 0.20 to 0.27 denied `Agent(general-purpose)`.
- The 0.27.0 profile set `cleanupPeriodDays` to 14, so Claude Code removed old transcripts.
- 0.28.0 brought the search context back in the add-on `dotclaude-codegraph`, with a `PreToolUse` hook on `Grep|Glob`.
  Claude Code 2.1.296 has no `Grep` or `Glob` tool, so that hook is gone.

## Removed browser note

The `recognize-captcha` skill and the offline `ddddocr-rs` OCR no longer exist in the browser plugin.
The CHANGELOG removed them in 0.20.0, because CloakBrowser keeps most CAPTCHAs away.

## The CLI against the LSP tool

Task 17.1 of the change `dotclaude-0-28-0` compared the CLI with the built-in LSP tool.
The reason was the rule that the plugin does not add runtime code for a feature that Claude Code has.
The user decided that the plugin ships whatever the comparison shows.

Setup:

- The model was `claude-sonnet-5-5`, in a headless sandbox run (`plugins/dotclaude-lab/bin/dotclaude-sandbox`) with no plugin of dotclaude.
- The project was 9 Python files (`shop/` and `tests/`) of about 80 lines.
- The question was "If I change the signature of `parse_amount`, which functions are affected, directly or through other calls, and in which files?"
- The true answer is 8 functions: `Cart.add`, `load_prices`, `apply_discount`, `build_cart`, `summary`, `main`, `test_parse`, and `test_discount`.
- The LSP tool needs a language server.
  The run used `pyright-langserver` (installed on the machine) through a scratch plugin with a `.lsp.json` file, and `ENABLE_LSP_TOOL=1`.
  The run did not test the tool without the variable.
  The tool is deferred, so Claude finds it with `ToolSearch` first.
  A machine with no server for the language has no LSP tool result.
- Input tokens are `input_tokens`, `cache_read_input_tokens`, and `cache_creation_input_tokens`, summed over the requests of the transcript.
  One run for each arm.

| Arm | Correct | Tool calls | Requests | Input tokens | Output tokens |
| --- | --- | --- | --- | --- | --- |
| No graph tool (`Grep`, `Glob`, `Read`) | 8 of 8 | 9 | 5 | 55,752 | 1,003 |
| CLI on `PATH`, index built, no instruction | 8 of 8 | 4, none of `codegraph` | 4 | 43,555 | 601 |
| LSP tool, no instruction | 8 of 8 | 11, none of `LSP` | 4 | 43,750 | 1,152 |
| CLI, told to use `codegraph impact` and `callers` | 6 of 8 | 1 `Bash` | 2 | 17,493 | 204 |
| LSP, told to use the LSP tool | 8 of 8 | 12 `LSP`, 1 `ToolSearch`, 2 `Read` | 8 | 77,004 | 2,351 |

What the result showed:

- With no instruction, Claude used neither tool.
  It read the files of the small project instead.
- When told to use it, the CLI answered in one call and used 4.4 times fewer input tokens than the LSP tool.
  The LSP tool took one call for each hop of the call chain.
- `codegraph impact` has a default depth of 2.
  It missed `summary` and `main`, which are three calls away.
  The `SessionStart` line gave `-d 5` for this reason.
- One run for each arm is not a rate.
