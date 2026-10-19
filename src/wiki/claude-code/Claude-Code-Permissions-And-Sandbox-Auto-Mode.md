# Claude Code Auto Mode

Auto mode lets Claude Code run without routine prompts.
A classifier model reads each action and blocks what is risky, such as a deploy to production or a push of secrets.
For example, `autoMode.environment` tells the classifier which repos and buckets your team trusts.
The marks are explained on [Permissions and Sandbox](Claude-Code-Permissions-And-Sandbox).

## How the Classifier Decides

- The classifier is a model call.
  It reads the transcript and the rules as its system prompt.
  The `critique` command text says: `The classifier is an LLM that reads these rules as part of its system prompt`.
- By default it allows an action.
  It blocks an action that matches a `hard_deny` rule, or a `soft_deny` rule that no `allow` rule and no clear user intent clears.
- `soft_deny` rules are for "destructive/irreversible actions that user intent can clear".
  `hard_deny` rules are "security boundaries that user intent does NOT clear".
  Source: the `autoMode` schema text in the bundle.
- If the classifier cannot answer, the call is blocked or goes to a person.
  Bundle texts: `Classifier unavailable`, `Auto mode classifier transcript exceeded context window - falling back to manual approval`.
- Repeated denials trip a circuit breaker (`enforceAutoModeDenialLimits`, `isAutoModeDenyCircuitBreaker` in the bundle).
- A server-side classifier can review actions instead.
  See `CLAUDE_CODE_AUTO_MODE_SERVER`.
  Server lists can add rules (`SERVER_AUTO_MODE_LISTS_ALL`, `_NO_ALLOW`, `_NONE`).
  The bundle ignores server entries that are not strings, are blank, or hold control characters.

## The `autoMode` Setting

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `autoMode.allow` | Exceptions to the soft deny rules | List of strings. `$defaults` inherits the built-in rules at that place | User, `--settings`, managed | [Choose a Permission Mode](https://code.claude.com/docs/en/permission-modes), [Configure Auto Mode](https://code.claude.com/docs/en/auto-mode-config) |
| ✅ | `autoMode.soft_deny` | Block rules that user intent can clear | Same list rules | Same | [Configure Auto Mode](https://code.claude.com/docs/en/auto-mode-config) |
| ✅ | `autoMode.hard_deny` | Block rules that no intent clears | Same list rules | Same | [Configure Auto Mode](https://code.claude.com/docs/en/auto-mode-config) |
| ✅ | `autoMode.environment` | Facts about your setup and trusted resources | Same list rules | Same | [Choose a Permission Mode](https://code.claude.com/docs/en/permission-modes), [Configure Auto Mode](https://code.claude.com/docs/en/auto-mode-config) |
| ✅ | `autoMode.classifyAllShell` | Suspends every `Bash` and `PowerShell` allow rule in auto mode | All shell commands go to the classifier. Default `false`. `true` from `~/.claude/settings.json` or `--settings` wins over a managed `false` | User, `--settings` | [Configure Auto Mode](https://code.claude.com/docs/en/auto-mode-config), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `permissions.disableAutoMode` | Turns auto mode off | Value `disable` | Settings | [Configure Permissions](https://code.claude.com/docs/en/permissions), [Choose a Permission Mode](https://code.claude.com/docs/en/permission-modes) |
| ✅ | `skipAutoPermissionPrompt` | The user accepted the opt-in dialog | Boolean | Settings | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `useAutoModeDuringPlan` | Plan mode uses auto semantics | Default `true` | Settings | [Choose a Permission Mode](https://code.claude.com/docs/en/permission-modes), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `permissions.defaultMode: "auto"` | Start in auto mode | Not from project or local settings | User, managed | [Choose a Permission Mode](https://code.claude.com/docs/en/permission-modes) |

Where the rules can come from: the bundle has the list `AUTO_MODE_TRUSTED_SOURCES` and a log event for an `untrusted_source`.
The old page says only policy, user, and flag settings set the rules.
The docs confirm only `classifyAllShell` for user and `--settings`.
The plugin `settings.json` does not accept `autoMode`.

## The `claude auto-mode` Commands

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `claude auto-mode defaults` | Prints the default `environment`, `allow`, `soft_deny`, and `hard_deny` as JSON | Option `--label <prefix>` shows only rules whose label starts with the prefix, without case | CLI | [Choose a Permission Mode](https://code.claude.com/docs/en/permission-modes), [Configure Auto Mode](https://code.claude.com/docs/en/auto-mode-config) |
| ✅ | `claude auto-mode config` | Prints the effective config as JSON | Your settings where set, defaults elsewhere | CLI | [Configure Auto Mode](https://code.claude.com/docs/en/auto-mode-config) |
| ✅ | `claude auto-mode critique` | Asks a model to review your custom rules | Option `--model <model>`. It checks clarity, completeness, conflicts, and actionability | CLI | [Configure Auto Mode](https://code.claude.com/docs/en/auto-mode-config) |
| ✅ | `claude auto-mode reset` | Removes `autoMode` from the user settings file | Option `-y, --yes` skips the prompt | CLI | - |
| ✅ | `/auto-mode-setup` | Scans the project and proposes `autoMode` rules | Shows `Auto-mode setup proposal is ready for review` | Interactive | [Configure Auto Mode](https://code.claude.com/docs/en/auto-mode-config) |

The `config` output marks custom rules as `(custom rules added alongside the defaults)` or `(custom rules replacing defaults)`.
A list without `$defaults` replaces the defaults.

## Environment Variables

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `CLAUDE_CODE_AUTO_MODE_SERVER` | Server-side review of auto mode actions | `0` uses own classifier requests. Needs `2.1.271` | Env | [Choose a Permission Mode](https://code.claude.com/docs/en/permission-modes) |
| ✅ | `CLAUDE_CODE_DISABLE_DANGEROUS_RM_TIMEOUT` | Removes the time limit of critical-path `rm` prompts | In auto mode these go to the classifier | Launch env only | [Choose a Permission Mode](https://code.claude.com/docs/en/permission-modes), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ❌ | `CLAUDE_CODE_ENABLE_AUTO_MODE` | Accepted, no effect | Auto mode is on for all providers | Env | `env.md` |
| 🔍 | `CLAUDE_CODE_AUTO_MODE_MODEL` | Model of the classifier | A server-configured classifier model wins, and the bundle logs `ignoring CLAUDE_CODE_AUTO_MODE_MODEL=` | Env | bundle |
| 🔍 | `CLAUDE_CODE_BG_CLASSIFIER_MODEL` | Classifier model for background sessions | Listed with the model env vars | Env | bundle |
| 🔍 | `CLAUDE_CODE_AUTO_MODE_TIER` | Any value sets the tier to `strict` | Source `env` | Env | bundle |
| 🔍 | `CLAUDE_CODE_CLASSIFIER_SUMMARY` | Chooses `llm` or `heuristic` summaries | Boolean parse, a hidden server-side flag picks the default | Env | bundle |
| 🔍 | `CLAUDE_CODE_TWO_STAGE_CLASSIFIER` | Two-stage classifier | Use unknown | Env | bundle name only |
| 🔍 | `CLAUDE_CODE_AUTO_MODE_EXTERNAL_PERMISSIONS` | Unknown | Use unknown | Env | bundle name only |
| 🔍 | `CLAUDE_CHROME_CLASSIFIER_FLOOR`, `CLAUDE_CHROME_PERMISSION_MODE` | Chrome extension permission input | Use unknown | Env | bundle names only |
| 🔍 | `CLAUDE_BG_SESSION_PERMISSION_RULES` | JSON with `allow`, `deny`, `addDirs` for a background session | Read when `CLAUDE_CODE_SESSION_KIND` is `bg`. Removed from child env | Env | bundle |
| 🔍 | `CLAUDE_CODE_PARKED_PERMISSION_WAIT_MS` | Wait for a parked permission | Default `2000` | Env | bundle |
| 🔍 | `CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG` | Own skills and commands cannot pre-approve tools | Personal hooks need existing rules | Env | bundle |

## See Also

- [Configure Auto Mode](https://code.claude.com/docs/en/auto-mode-config) is the docs page for the `autoMode` settings.
- [Auto Mode Allow and Environment](Claude-Code-Permissions-And-Sandbox-Auto-Mode-Allow) lists the default exceptions.
- [Auto Mode Soft Deny](Claude-Code-Permissions-And-Sandbox-Auto-Mode-Soft-Deny) lists the default block rules.
