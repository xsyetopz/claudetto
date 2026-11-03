# Auto Mode

What setup writes to `autoMode`, and what Claude Code `2.1.317` does with it. Every command here ran without a model call. The code is in `plugins/claudetto/src/automode/`: `automode.ts` holds the keys, `rules.ts` holds the lists, and `faults.ts` holds the checks.

## The Built-in Lists

`claude auto-mode defaults` prints the built-in rules as JSON: 82,359 bytes, with 16 `allow`, 72 `soft_deny`, 1 `hard_deny`, and 21 `environment` entries. The listing is not copied here, because a copy drifts at each release. Run the command to read it.

`claude auto-mode config` prints the effective lists: the settings where set, the defaults otherwise. With an empty `CLAUDE_CONFIG_DIR` and no `autoMode` key, its output is the same 82,359 bytes as `defaults`. The `--settings FILE` flag has to come before the subcommand: `claude --settings FILE auto-mode config` reads the file, and `claude auto-mode config --settings FILE` fails with `unknown option '--settings'`. The lists of the user settings file and of `--settings` are added together in the output, so a read of only our lists needs an empty `CLAUDE_CONFIG_DIR`.

`claude auto-mode critique` and `claude auto-mode reset` are the other two subcommands. `critique` asks a model to review the rules, so it is a paid call and was not run for this page.

## What Setup Writes

| Key | Value | Behavior it changes |
| --- | --- | --- |
| `autoMode` | written to the user settings file only | The program reads it from user settings, `--settings`, and managed settings. A project or local settings file is not trusted for it, and the program logs `tengu_settings_auto_mode_untrusted_source_ignored`. |
| `autoMode.allow`, `autoMode.soft_deny`, `autoMode.hard_deny` | the lists of `suiteSnippet()` in `plugins/claudetto/src/automode/rules.ts` | A list without `$defaults` replaces the built-in rules. The schema text says to include the literal string `$defaults` to inherit the built-in rules at that position. |
| `autoMode.environment` | the two trust entries of `suiteSnippet()` | It replaces the 21 built-in entries. It holds no fact of one repository, because `autoMode` is read in every repository. |
| `autoMode.classifyAllShell` | unset | `true` suspends every `Bash` and `PowerShell` allow rule while auto mode is on, so each shell command goes to the classifier. The default is `false`, and `false` equals unset. The flag is on when any source sets `true`, so writing `false` could not turn off a managed `true`. |
| `CLAUDE_CODE_AUTO_MODE_MODEL` | unset | Moves the classifier model. The program logs `Auto mode classifier: ignoring CLAUDE_CODE_AUTO_MODE_MODEL=...` and uses the model when a server-configured classifier model takes priority. |

## The Suite

`suiteSnippet()` has 7 `allow`, 9 `soft_deny`, 1 `hard_deny`, and 2 `environment` entries, 4,092 characters in all. `claude --settings FILE auto-mode config` with only that snippet and an empty `CLAUDE_CONFIG_DIR` printed the same four lists back, entry for entry.

Each rule carries a `covers` list of the built-in rules it replaces. The soft rules keep the `[named+specifics — **must name:** ...]` bar that the built-in frame reads to decide what the user must name. The hard rule has no bar.

## What the Lists Cost

`just capture --classifier` reads the request of the built-in classifier:

| Lists | Total | `system` | Middle `system` block |
| --- | --- | --- | --- |
| built-in defaults | 141,962 | 140,337 | 140,015 |
| `suiteSnippet()` through `--settings` | 64,916 | 63,469 | 63,147 |

The first and last `system` blocks are 74 and 248 characters in both, and the messages are 616 characters. The `plain` and the `plugin` arm read the same, because the lists are the only thing that changes the request.

## The Faults

`autoModeFaults()` reports and never repairs. It reports:

- `defaults-dropped`: a list that has no `$defaults` and is not the suite list.
- `broad-allow`: a `Bash(*)` rule, or a wildcarded `bash`, `sh`, `zsh`, or `python` rule. The program has `stripDangerousPermissionsForAutoMode` and `restoreDangerousPermissions`, which remove such allow rules on entering auto mode and restore them on leaving it, so a broad rule in the snippet would never take effect. Which shapes the program strips was not read from the program, and the check covers only the `Bash` shapes setup could write.
- `classify-all-shell`: `autoMode.classifyAllShell` set to `true`.
- `classifier-model`: `CLAUDE_CODE_AUTO_MODE_MODEL` in the `env` block.

## The Critique

Before a release the rules should pass `claude auto-mode critique`, with each finding fixed or answered here. No run was made for `2.1.317`, because it is a paid call, so there is no finding to answer yet. The findings and replies for earlier lists are gone, since they were about rules that the suite replaced.
