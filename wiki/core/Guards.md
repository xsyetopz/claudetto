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
| Module guard | `src/plugins/dotclaude/slices/guard/` (`slice.ts`, `adapters/mod.ts`, `domain/guard.ts`, `domain/matchers/`) | One `tool.check` handler for the policy ask and the adherence ask. |
| Destructive floor | The `autoMode` lists in your user settings, and the `guard` hook | Asks for root rights, and forbids destructive work. See [The destructive floor](#the-destructive-floor). |

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
For the destructive forms that lose uncommitted work or history, the floor decides.
See [The destructive floor](#the-destructive-floor).

## The destructive floor

Normal work passes with no prompt.
Work that asks for root rights asks you first.
Destructive work is forbidden, also when you ask for it.
The floor is a catalog of rules in `src/kernel/policy/`.
Each rule has an `id`, a `tier`, and a `category`.

| Tier | Where it is written | What it does |
| --- | --- | --- |
| `soft_deny`, rule `system.privilege` (`ask`) | `autoMode.soft_deny` in your user settings | Asks you before a root-rights command, such as `sudo`. |
| `hard_deny`, `floor` | `autoMode.hard_deny` in your user settings | Forbids the action in every session. The classifier denies it in auto mode, and the `guard` hook denies the literal forms. |
| `hard_deny`, `subagent` (rule `git.shared-checkout`) | `autoMode.hard_deny` in your user settings | Forbids a git form that changes the checkout that other workers share. The `guard` hook denies it in a subagent only. |

The rules of each category are:

| Category | Rules | Tier |
| --- | --- | --- |
| `git` | `git.discard-uncommitted`, `git.clean`, `git.stash-drop`, `git.history-rewrite`, `git.force-push-default`, `git.delete-branch`, `git.delete-repo` | `floor` |
| `git` | `git.shared-checkout` | `subagent` |
| `system` | `system.recursive-delete`, `system.disk`, `system.permissions`, `system.security` | `floor` |
| `system` | `system.privilege` | `ask` |
| `database` | `db.drop`, `db.truncate`, `db.unscoped-write`, `db.reset`, `db.flush`, `db.delete-files` | `floor` |
| `cloud` | `cloud.destroy` | `floor` |
| `backups` | `backups.delete` | `floor` |

`git stash drop` and `git stash clear` are forbidden always.
`git stash` in a subagent is forbidden by `git.shared-checkout`.

### Set the floor

Claude Code reads `autoMode` only from the user settings, so setup writes it there only.
Run `dotclaude-setup settings --scope user` first.
It prints each changed list, and it writes nothing.
Run `dotclaude-setup settings --scope user --apply` to write the lists.

Each list starts with `$defaults`, which takes the built-in list of Claude Code.
Setup adds each entry that a list lacks at its end, and it keeps your own entries.
An entry that you remove comes back with the next `--apply`.

### When a destructive command is stopped

The floor denies the command with the text `dotclaude forbids this destructive action`.
The deny gives the exact command in a fenced block.

1. In the main session, Claude stops.
   It does not try the action in another way.
   It asks you to run the exact command with a `!` command, and then it waits.
2. In a subagent, Claude stops.
   It puts the exact command in its report, and the main session gives it to you.
3. If you want the action, run the command yourself with the `!` prefix.
   The floor does not stop your own command.

### Add a rule

1. For a new category, add `src/kernel/policy/rules/<category>.ts` that exports a `readonly PolicyRule[]`.
   Then add one line to `src/kernel/policy/index.ts`, which spreads the new list into `POLICY_RULES`.
2. For a new rule, add one entry to the file of its category.
   The entry needs a unique `id`, a `tier`, and `prose`.
   A forbidden rule ends its prose with `withAnyRoute`, which adds the wrapper clause.
3. For the `guard` hook to deny the form, add a matcher with the same `id` in `src/plugins/dotclaude/slices/guard/domain/matchers/`.
   A matcher whose `id` the catalog does not hold gets the `floor` tier.
4. Run `just generate`, then `just test tests/kernel/policy.test.ts tests/dotclaude/setup`.

### Known limits

The live runs are recorded in the evidence file `destructive-floor.md` of the 1.0.0 change.

- In the live runs of a subagent, the classifier stopped each hidden form before the `guard` hook saw the call.
  The hidden forms were `bash -c`, `eval`, a variable that holds `git`, and `python3 -c` with `subprocess`.
  So the subagent layer of the hook has tests at the adapter only, in `tests/dotclaude/guard/shared-git.test.ts` and `tests/dotclaude/guard/matrix/subagent.test.ts`.
- The lab cannot mark a call as a subagent's call, so the lab does not test the subagent deny.
- A recursive delete in a worktree with no `node_modules` removed nothing, so the live runs did not test `system.recursive-delete`.
- The `claude auto-mode critique` command gave no feedback in five runs, so no rule prose changed.

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

`slice.ts` registers one `tool.check` handler, `onCheck` in `adapters/mod.ts`.
It calls the engine first, and it returns a deny of the engine unchanged.

| Case | What the module does |
| --- | --- |
| `git clone`, `gh`, `curl`, `wget`, or a `WebFetch` of a repository of another owner that has `CLAUDE.md`, `AGENTS.md`, or `AI_POLICY.md` | Asks once per session and per repository, and shows the policy text. See [Contributions](Contributions). |
| A `Bash` command that matches a `floor` rule | Denies it in every session. See [The destructive floor](#the-destructive-floor). |
| A `Bash` command in a subagent that matches `git.shared-checkout` | Denies it. The subagent works in its own worktree instead. |

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
  With `"block"`, a hook that cannot start, for example when `bun` is not on `PATH`, would block each guarded call until `bun` works again, with a warning only in the log.
  Claude cannot repair a missing `bun`, so the guards fail open, and the permission rules and the sandbox still apply.
  The decision is D31 in `design.md` of the 0.28.0 change.

The `git` ask in `features/adherence/git.ts` and the file-print deny in `features/reads/rules.ts` read commands with the shared reader `lib/shell.ts`.
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
2. Change the call so that it follows the rule.
3. If the rule is wrong for your project, change the rule in your own settings file.
   The drift check does not compare permission rules, so nothing else needs a change.
4. For a destructive deny, do not look for another way.
   Run the exact command yourself with a `!` command, if you want the action.
   See [The destructive floor](#the-destructive-floor).

## What to do when a call asks

1. Read the reason.
2. Choose to allow or reject the call.
3. For the policy ask, read the policy that the prompt shows before you allow.
   If the policy forbids AI tools, reject the call.

## Troubleshooting

See [Troubleshooting](Troubleshooting#the-core-plugin-dotclaude) for a missing `rm` ask, a missing policy ask, and a failed `git push` in the sandbox.

## Related pages

- [Core plugin](Core-Plugin)
- [Claude mods](Claude-Mods)
- [Design](Design)
