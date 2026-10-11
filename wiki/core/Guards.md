# Guards

Since 0.27 dotclaude guards a session with three layers.
Permission rules from the [settings snippet](Settings-Snippet) do most of the work.
The sandbox limits what a command can reach.
One hooks module covers the cases that a rule cannot match.
The plugin alone gives no `rm` ask, because a plugin cannot ship `permissions`.
The `rm` ask is a rule of the settings snippet.
The module itself keeps the policy ask in memory, with no file.
This page lists each layer, what to do when one fires, and how to change one.

## The layers

| Layer | Where it lives | What it does |
| --- | --- | --- |
| Permission rules | `permissions` in the [settings snippet](Settings-Snippet), copied by you into your `settings.json` | Deny, ask, and allow lists for tools and commands. |
| Sandbox | `sandbox` in the same snippet | Runs Bash commands in the Claude Code sandbox, with a list of allowed domains. |
| Module guard | `hooks/register.mjs`, with pure rules in `features/guard/rules.mjs` | One `tool.check` handler for the policy ask. |

Deny rules are not a security boundary on their own, so the snippet pairs them with the sandbox ([Design](Design)).

## Permission rules

| List | What it holds |
| --- | --- |
| deny | Reads of secret files, `rm -rf` of `/`, `/*`, `~`, and `~/*`, `mkfs`, `dd` to a device, the `general-purpose`, `claude-code-guide`, and `statusline-setup` agents (`Agent(...)`), the `mcp__computer-use` tools, and the tools `ScheduleWakeup`, `ReportFindings`, `EnterPlanMode`, `ExitPlanMode`, `TaskCreate`, `TaskGet`, `TaskList`, `TaskStop`, and `TaskUpdate`. |
| ask | Force pushes, a recursive `rm`, `git reset --hard`, `git clean`, `git branch -D`, `git checkout --`, `git restore`, piped shells, `sudo`, publishes, `gh pr` and `gh issue` writes, `gh release`, and SQL drops and truncates. |
| allow | Read-only `git` and `gh` commands, and the build and test runners (`bun`, `npm`, `pnpm`, `cargo`, `go`, `just`, `make`). |

The snippet also sets `disableBypassPermissionsMode`, so no mode skips these rules.
The exact patterns are in the [settings snippet](Settings-Snippet).
These layers apply only to the keys that you copy, because dotclaude writes no setting.

## The sandbox

The snippet sets `sandbox.enabled` and `allowUnsandboxedCommands: true`.
A command that fails in the sandbox can retry outside it with `dangerouslyDisableSandbox`, and Claude Code asks you to approve each retry.
The reason is that the sandbox limits files and hosts, and it cannot tell a dangerous command from a safe one.
In the sessions of 2026-10-08, it stopped only safe commands: `bun` (it reads `.env` at start), `gh` (it fails the TLS check of the sandbox proxy), and calls to `api.anthropic.com`.
The `deny` and `ask` rules stop the dangerous commands, in and out of the sandbox.
These commands run outside the sandbox, because they need your credentials and the network: `git fetch`, `git pull`, `git push`, and `gh`.
`allowedDomains` lists GitHub, npm, PyPI, crates.io, and `proxy.golang.org`.

dotclaude uses no managed settings, and the snippet holds the sandbox, `disableBypassPermissionsMode`, and the deny list.
See [Off switches](Off-Switches#managed-settings) for the trade-off.

## No managed file

dotclaude writes no managed settings file.
The built-in guard `sec-default` of Claude Code is therefore not seated on a machine that has no managed settings and is not in a Team or Enterprise organization.
In that case dotclaude loads at tier `user`, and its prompt handlers reach the request.

- With the guard not seated, an installed mod with a `tool.check` hook can turn a content deny rule into an allow.
  A path deny and a whole-tool deny stay enforced.
  The guard of dotclaude never weakens a deny.
- dotclaude does not seat the guard.
  On a machine that has managed settings, the drift check reports that the guard is seated and names the dotclaude parts that it skips.
  It skips the shared sections and the model variants (`prompt.compose`).
- Review the mods that you install, because they run with your permissions.

See D2 in [Decisions](Decisions-Settings) and [Off switches](Off-Switches#managed-settings).

## The module guard

`hooks/register.mjs` registers one `tool.check` handler.
It calls the engine first, and it returns a deny of the engine unchanged.

| Case | What the module does |
| --- | --- |
| `git clone`, `gh`, `curl`, `wget`, or a `WebFetch` of a repository of another owner that has `CLAUDE.md`, `AGENTS.md`, or `AI_POLICY.md` | Asks once per session and per repository, and shows the policy text. See [Contributions](Contributions). |

The module has no `.catch`, so it fails open.
When `gh` is missing or a call fails, the verdict of the engine stands.
A call for the policy has a 5-second timeout.

The tests of the module are in `plugins/dotclaude/tests/mod.test.ts`, and `just lab` runs them with stubbed events.
No command runs in them.
See [Development](Development).

## The auto-mode classifier

In auto mode, the classifier decides an ask of `tool.check`, and it can allow the call.
An ask of a classic `PreToolUse` hook stops the call in auto mode (**measured**, 2.1.292, see [Claude mods](Claude-Mods#auto-mode-module-ask-against-classic-ask)).
0.27.0 used such a hook for the `rm` ask.
0.28.0 removed that hook and the `rm` parser, because a shell parser cannot read every form of a command.

- The [settings snippet](Settings-Snippet) has `ask` permission rules for each recursive `rm`, also inside the project.
  The rules match any flag spelling with an `r` or `R`, and `--recursive`.
- The sandbox stops a write outside the allowed folders, so a recursive `rm` of a path outside them fails.
- The policy ask for a repository of another owner stays in the module, which keeps the repositories that it checked in memory, for each session.
  So in auto mode the classifier decides the policy ask.
- No hook in `hooks.json` sets `onFailure`, so the default `continue` applies.
  With `"block"`, a hook that cannot start, for example when `node` is not on `PATH`, would block each guarded call until `node` works again, with a warning only in the log.
  Claude cannot repair a missing `node`, so the guards fail open, and the permission rules and the sandbox still apply.
  The decision is D31 in `design.md` of the 0.28.0 change.

The `git` ask in `features/adherence/git.mjs` and the file-print deny in `features/reads/rules.mjs` read commands with the shared reader `lib/shell.mjs`.
It splits a command at `;`, `&&`, `||`, `|`, `&`, and newlines, and it reads `$(...)`, backticks, `sh -c`, `bash -c`, and `eval`.
It strips wrapper commands such as `sudo`, `env`, `nice`, `timeout`, and `xargs`.

Auto mode ignores some allow rules of the snippet, because they would bypass the classifier: `Bash(bun run *)`, `Bash(npm run *)`, and `Bash(pnpm run *)` (**measured**, debug log).
In auto mode the classifier decides those commands.

> **Note:** The six add-on plugins add no guard.
> The one deny is in [Browser](Browser).
> Its hook denies `WebSearch` only for an empty query, or for the `cloakbrowser` backend with no CloakBrowser binary.
> When the browser search fails, the built-in `WebSearch` answers.
> The Jev hook only adds a pick to a question.

## What to do when a call is denied

A deny is a decision of you.
Claude must not get the same result in another way.

1. Read the reason in the deny message.
1. Change the call so that it follows the rule.
1. If the rule is wrong for your project, change the rule in your own settings file.
   The drift check does not compare permission rules, so nothing else needs a change.

## What to do when a call asks

1. Read the reason.
1. Choose to allow or reject the call.
1. For the policy ask, read the policy that the prompt shows before you allow.
   If the policy forbids AI tools, reject the call.

## Troubleshooting

See [Troubleshooting](Troubleshooting#the-core-plugin-dotclaude) for a missing `rm` ask, a missing policy ask, and a failed `git push` in the sandbox.

## Related pages

- [Core plugin](Core-Plugin)
- [Claude mods](Claude-Mods)
- [Design](Design)
