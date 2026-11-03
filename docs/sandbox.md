# Sandbox

This file records the sandbox keys that the plugin sets and checks. The keys were read from the settings schema inside the Claude Code `2.1.317` program (`LC_ALL=C strings -n 40`). The table is in `plugins/claudetto/src/sandbox/sandbox.ts`, the snippet is `sandboxSnippet()`, and the checks are `sandboxFaults()` in `plugins/claudetto/src/sandbox/faults.ts`.

Setup writes the `sandbox` block to the user settings file only, which is the one scope setup owns for this login. The `2.1.317` schema text for `allowUnsandboxedCommands` says: "A false in managed, --settings or user settings holds whatever project settings say (false there still applies)." So a `false` from a project file also applies.

## Keys

| Key | Value claudetto writes | Behavior it changes |
| --- | --- | --- |
| `sandbox.enabled` | `true` where the platform is macOS or Linux (WSL reports `linux`) | Runs `Bash` in the sandbox. Default `false`. |
| `sandbox.autoAllowBashIfSandboxed` | none | Auto-allows a sandboxed command, reason `Auto-allowed with sandbox (autoAllowBashIfSandboxed enabled)`. The key is optional, and claudetto leaves it unset so the program's default stands. |
| `sandbox.allowUnsandboxedCommands` | `false` | Lets a call use the `dangerouslyDisableSandbox` parameter of `Bash`. At `false` the parameter is ignored. |
| `sandbox.failIfUnavailable` | none | Exit at startup if the sandbox cannot start. An exit is worse for this user than an unsandboxed session with a warning. |
| `sandbox.filesystem.denyRead` | `~/.ssh`, `~/.gnupg`, `~/.aws/credentials`, `~/.netrc`, `~/.docker/config.json` | "Additional paths to deny reading within the sandbox. Merged with paths from Read(...) deny permission rules." |
| `sandbox.filesystem.allowRead` | none | "Paths to re-allow reading within denyRead regions. Takes precedence over denyRead for matching paths." So an entry over a secret path re-opens it. |
| `sandbox.excludedCommands` | none | "Command patterns (Bash permission-rule syntax) for commands to run outside the sandbox." A convenience and not a boundary, so `denyRead` does not bind them. |

## Faults

`sandboxFaults()` reports and never repairs: `sandbox-off`, `unsandboxed-allowed`, `deny-read-missing` (one per missing secret path), `allow-read-reopens`, and `excluded-reopens`. A parent folder in `denyRead` covers the path under it, and `/**` on an entry is ignored.

## Not Checked

No run of `claude` exercised the sandbox. The two scenarios of the spec, a sandboxed command with no prompt and a read of `~/.ssh` denied, are checked as values by `sandboxedCommandDecision()` and `sandboxedReadDecision()`, which model the documented behavior in `plugins/claudetto/src/sandbox/__tests__/sandbox.spec.ts`. What a run would add is that the operating system really refuses the read on this machine.
