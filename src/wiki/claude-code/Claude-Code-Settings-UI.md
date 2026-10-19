# Claude Code Settings: UI

These keys change how Claude Code looks: the theme, the spinner, the notices, and the terminal display.
For example, `{ "spinnerTipsEnabled": false }` hides the tips under the spinner.

The marks and the scopes are explained on [Settings](Claude-Code-Settings).
A `-` in the `Default` column means that neither the docs nor the schema state a default.

| Mark | Key | Type | Default | What It Is For | Scope | Source |
| --- | --- | --- | --- | --- | --- | --- |
| ✅ | `autoScrollEnabled` | boolean | - | Follow new output to the bottom in fullscreen rendering. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| 🔍 | `breakReminder` | object | - | Show a dismissible nudge after long continuous use. It never blocks. | Settings files | Bundle settings schema |
| ✅ | `companyAnnouncements` | array of string | - | Show your organization's announcements at startup. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `editorMode` | string | - | Use vim key bindings in the input prompt. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `emojiCompletionEnabled` | boolean | - | Turn off `:shortcode:` emoji suggestions and replacement in the prompt input. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `feedbackDrafts` | enum: `notify`, `quiet`, `off` | - | Control whether Claude queues feedback drafts for you to review. | User, managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `feedbackSurveyRate` | number | - | Change how often the session quality survey appears. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `footerLinksRegexes` | array | - | Make issue or review IDs in output into clickable links below the input box. | User, managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ❌ | `keybindingFlavor` | enum: `classic`, `readline` | - | Has no effect now. Word-editing keys in the prompt always follow Bash (readline) rules. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `maxProseWidth` | integer | - | Cap how wide the prose in Claude's responses runs in a wide terminal. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `preferredNotifChannel` | string | - | Choose a terminal bell or desktop notification for task completion. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `prefersReducedMotion` | boolean | - | Reduce or turn off spinner, shimmer, and flash animations. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `promptSuggestionEnabled` | boolean | - | Hide the grayed-out prompt suggestions in the input box. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `prUrlTemplate` | string | - | Point PR links at an internal code-review tool instead of github.com. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| 🔍 | `quietHours` | object | - | Show one soft nudge per session during a local-time window you set. It never blocks. | Settings files | Bundle settings schema |
| ✅ | `showClearContextOnPlanAccept` | boolean | `false` | Show a "clear context" option on the plan accept screen. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| 🔍 | `showMessageTimestamps` | boolean | - | Stamp each message with its arrival time. The docs name a VS Code extension setting with this name, not this settings key. | Settings files | Bundle settings schema |
| ✅ | `showTurnDuration` | boolean | - | Hide the "Cooked for" duration after each response. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `spellcheck` | object | - | Underline misspelled words in the prompt input with a spell checker you install. | User, managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `spinnerTipsEnabled` | boolean | - | Hide tips in the spinner while Claude works. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `spinnerTipsOverride` | object | - | Add your own tips to the spinner rotation, or replace the built-in tips. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `spinnerVerbs` | object | - | Add or replace the verbs shown while a turn runs. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `syntaxHighlightingDisabled` | boolean | - | Turn off syntax highlighting in diffs and code blocks. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `terminalProgressBarEnabled` | boolean | - | Hide the terminal progress bar in terminals that support it. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `terminalTitleFromRename` | boolean | `true` | Stop `/rename` and `--name` from changing the terminal tab title. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `theme` | string | - | Pick the interface color theme, built-in or custom. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `timeFormat` | string | - | Show the times in the interface on a 12-hour or 24-hour clock, in UTC, or with a strftime pattern. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `timeZone` | string | The system time zone | Show the times in the interface in a time zone other than your system's. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `tui` | enum: `default`, `fullscreen` | - | Choose the fullscreen or classic terminal renderer. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `verbose` | boolean | - | Show full tool output instead of truncated summaries, and `viewMode` takes precedence when both are set. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `viewMode` | enum: `default`, `verbose`, `focus` | - | Start every session in default, verbose, or focus view. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `vimInsertModeRemaps` | object | - | Map a two-key INSERT-mode sequence such as `jj` to Escape. | User, managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `voice` | object | - | Turn on voice dictation and pick hold or tap mode. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `wheelScrollAccelerationEnabled` | boolean | - | Turn off mouse-wheel acceleration in fullscreen rendering. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |

## See Also

- [Settings](Claude-Code-Settings) explains the marks, the scopes, and the precedence.
- [Settings Reference](https://code.claude.com/docs/en/settings-reference) is the docs page for each key.
- [Status Line](Claude-Code-Status-Line) and [Output Styles](Claude-Code-Output-Styles) cover two related features.
- [Customize Keyboard Shortcuts](https://code.claude.com/docs/en/keybindings) covers key bindings.
