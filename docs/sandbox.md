# Sandbox

Change `claudetto-restart`, task 6.5, the sandbox half of the `low-hitl` capability
(`openspec/changes/claudetto-restart/specs/low-hitl/spec.md:108`). The keys below were read from
`clawdipedia` route `configure/permissions/sandbox` for Claude Code `2.1.312`. The table is in
`plugins/claudetto/src/sandbox/sandbox.ts`, the snippet is `sandboxSnippet()`, and the checks are
`sandboxFaults()` in `plugins/claudetto/src/sandbox/faults.ts`.

Setup writes the `sandbox` block to the user settings file only, which is the one scope setup owns for
this login. The route names user settings as a scope a `false` of
`sandbox.allowUnsandboxedCommands` holds from, and it counts an `excludedCommands` entry from no scope
other than managed, `--settings`, and user settings. Whether a `false` from a project file also holds
was not established: the route puts the key in every scope, and the program's scope-merge table marks
`false` as the restrictive value of it, which points the other way.

## Keys

| Key | Value claudetto writes | Behavior it changes | Route |
| --- | --- | --- | --- |
| `sandbox.enabled` | `true` where the platform is macOS or Linux (WSL reports `linux`) | Runs `Bash` in the sandbox. Default `false`. Without its dependencies a warning shows and commands run unsandboxed. | `configure/permissions/sandbox` |
| `sandbox.autoAllowBashIfSandboxed` | none | Auto-allows a sandboxed command, reason `Auto-allowed with sandbox`. Default `true`, so enabling the sandbox is what removes the prompt. | `configure/permissions/sandbox` |
| `sandbox.allowUnsandboxedCommands` | `false` | Default `true` lets a call use the `dangerouslyDisableSandbox` parameter of `Bash`. At `false` the parameter is ignored. | `configure/permissions/sandbox` |
| `sandbox.failIfUnavailable` | none | Exit at startup if the sandbox cannot start. Default `false`. An exit is worse for this user than an unsandboxed session with a warning. | `configure/permissions/sandbox` |
| `sandbox.filesystem.denyRead` | `~/.ssh`, `~/.gnupg`, `~/.aws/credentials`, `~/.netrc`, `~/.docker/config.json` | Paths denied for reads, merged across scopes. | `configure/permissions/sandbox` |
| `sandbox.filesystem.allowRead` | none | Wins over `denyRead`, so an entry over a secret path re-opens it. | `configure/permissions/sandbox` |
| `sandbox.excludedCommands` | none | Patterns that run outside the sandbox. A convenience and not a boundary, so `denyRead` does not bind them. | `configure/permissions/sandbox` |

The spec names `~/.ssh` and no list. The five paths are the list the user's own
`~/.claude/settings.json` already holds under `sandbox.filesystem.denyRead`, measured in the session of
this task.

## Faults

`sandboxFaults()` reports and never repairs: `sandbox-off`, `unsandboxed-allowed`, `deny-read-missing`
(one per missing secret path), `allow-read-reopens`, and `excluded-reopens`. A parent folder in
`denyRead` covers the path under it, and `/**` on an entry is ignored.

## Live Finding

Measured in the session of this task: `sandbox.enabled` is in none of the three settings files of this
login (`~/.claude/settings.json`, `.claude/settings.json`, `.claude/settings.local.json`), and there is
no managed settings file. By its documented default `false` the sandbox is off, so the
`sandbox.filesystem.denyRead` and `denyWrite` lists in the user file are inert today. The
`Read(~/.ssh/**)` deny rules of `permissions.deny` still hold, but the route says such a rule "still
applies to the file tools", so it covers `Read` and not a `cat` of the same file: a `Bash` read of a
secret path in this login is stopped by claudetto's own gate and by nothing else.

The user decided to leave `sandbox.allowUnsandboxedCommands` unset in the live file. That decision is
about the live file only. The snippet still carries `false`, because the spec requires setup to write it.

## Not Checked

No run of `claude` exercised the sandbox. The two scenarios of the spec, a sandboxed command with no
prompt and a read of `~/.ssh` denied, are checked as values by `sandboxedCommandDecision()` and
`sandboxedReadDecision()`, which model the documented behavior in `plugins/claudetto/src/sandbox/__tests__/sandbox.spec.ts`.

The behavior they model was also read out of the installed program rather than the docs alone. In
`2.1.312`, module `chunk-tbcewt4x.js` carries the permission reason text `Auto-allowed with sandbox
(autoAllowBashIfSandboxed enabled)` beside the list of decision sources, so the no-prompt path is the
program's own; and module `chunk-ce589w22.js` carries the settings-schema text for each key above,
including "Additional paths to deny reading within the sandbox. Merged with paths from Read(...) deny
permission rules." for `denyRead` and "Paths to re-allow reading within denyRead regions. Takes
precedence over denyRead for matching paths." for `allowRead`. What a run would add, and these reads
cannot, is that the operating-system wall really refuses the read on this machine.
