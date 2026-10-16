# Auto Mode

This page describes how the auto mode classifier of Claude Code `2.1.296` decides a permission.
Read it if you write your own `autoMode` rules.
Auto mode runs a tool call without a prompt when the classifier allows it.
The rules in this page are the defaults of `2.1.296`.
A later version can change them.

## How the Classifier Decides

The classifier reads the action and its rules.
Then it allows or blocks the action.

- By default, the classifier allows an action.
- It blocks an action only in two cases.
  In the first case, the action matches a hard deny rule.
  In the second case, the action matches a soft deny rule and no allow rule applies.
- User intent never clears a hard deny rule.
- Explicit user direction can clear a soft deny rule when the evidence for the direction is strong enough.

Source: the text of the classifier rules in the `2.1.296` binary.
A search of the extracted strings in `external/cc-2.1.296/strings.txt` found the text.
Git ignores that file.
The text is a paraphrase here.

## The Four Keys of `autoMode`

The `autoMode` object of the settings has four keys.
Each key takes a list of rule texts.

| Key | Meaning |
| --- | --- |
| `allow` | Exceptions to the soft deny rules. |
| `soft_deny` | Rules that block an action, unless an allow rule applies. |
| `hard_deny` | Rules that block an action, and that no user intent clears. |
| `environment` | Fields that describe your organization, and the resources that the classifier can trust. |

An entry `$defaults` in a list expands to the built-in list of that key.
A list with `$defaults` first keeps the built-in rules.
It adds your rules after them.

Source: the key names come from the output of `claude auto-mode defaults` in `2.1.296`.
That output is saved as `external/cc-2.1.296/automode-defaults.json`.
A search of the binary strings for the literal entry showed the meaning of `$defaults`.

## Where the Setting Can Come From

Claude Code reads `autoMode` only from the user settings, the `--settings` flag, and the managed settings.
It ignores `autoMode` in the project settings and in the local settings, because a repository controls those files.
When it ignores such a value, it writes a log event.

Source: a text in the `2.1.296` binary says that only policy, user, and flag settings can set the rules.
A search of the extracted strings for the `untrusted_source` event names found the text.

Plugins cannot set `autoMode`.
This is inference.
It comes from the `settings.json` of a plugin, which accepts only the `agent` and `subagentStatusLine` keys.
The evidence file `automode.md` says so.

## The Commands

| Command | What it does |
| --- | --- |
| `claude auto-mode defaults` | Prints the built-in rules. |
| `claude auto-mode config` | Prints the effective rules, which are the built-in rules with your changes. |
| `claude auto-mode critique` | Reviews your custom rules. |
| `claude auto-mode reset` | Deletes `autoMode` from the user settings file. |

Source: a search of the extracted strings found the four handler names of the commands in the `2.1.296` binary.
The output of the `defaults` command is the file `external/cc-2.1.296/automode-defaults.json`.

## The Defaults of `2.1.296`

The built-in lists of `2.1.296` have these sizes.

| Key | Entries | Examples |
| --- | --- | --- |
| `allow` | 17 | `Local Operations`, `Read-Only Operations`, `Declared Dependencies`, `Session-Created Job Cleanup`, `Multi-Agent Coordination` |
| `soft_deny` | 72 | `Git Destructive`, `Irreversible Local Destruction`, `Unverifiable Deletion Target`, `Shared Scratch Sweep`, `Credential Leakage`, `Code That Leaks When Run` |
| `hard_deny` | 1 | `Data Exfiltration` |
| `environment` | 21 | `Trusted repo`, `Source control`, `Trusted internal domains` |

Source: the counts and the names come from `external/cc-2.1.296/automode-defaults.json`.
A script read the file and counted the entries of each key.

- Each `soft_deny` rule names the actions that it covers.
- Each allow rule names the cases that clear a soft deny rule.
- Each `environment` field is a text for you to fill in.
  Most default texts of the fields say `None configured`.

## Adding Your Own Rules

1. Set your rules in the user settings.
   Keep `$defaults` in each list that you change.
2. Run `claude auto-mode config` to check the effective rules.

Without `$defaults`, the list replaces the built-in rules.
This is inference from the `$defaults` entry, and no test ran it.

Put the facts of your organization in `environment`, such as the trusted repository and the trusted domains.

## Example: A Blocked Worktree Removal

On 2026-10-12, the classifier blocked the command `git worktree remove -f -f` with `git branch -d`.
The command deleted three clean worktrees.
Agents made those worktrees, and they were merged.
The blocking rule was `Irreversible Local Destruction`.

- The rule names `git worktree remove --force` and `rm -rf`.
  It presumes that a working tree is dirty.
- The rule has a clause for an agent-created worktree or a scratch clone.
  The session did not show that it made those worktrees, because another session made them.
- `Shared Scratch Sweep` blocks a delete by a pattern in `/tmp` or in `$TMPDIR`.
  It allows the delete of a named path that the agent worked with.
- `Unverifiable Deletion Target` blocks `rm -rf` of a variable whose value the transcript does not show.

An entry in `environment` that names the agent worktrees and the Claude Code temp folders could let the clause apply.
This is inference, and no test ran it.

## What claudetto Writes

Setup writes to the user settings only.
The setup code states this in `src/plugins/claudetto/slices/setup/domain/automode.ts`.
For each of the four keys, setup adds `$defaults` first.
Then it adds the rules of the claudetto catalog.

- The `ask` rules go to `soft_deny`.
- The `floor` and `subagent` rules go to `hard_deny`.
- The two allow rules go to `allow`.
  They cover the removal of an agent worktree and the cleanup of the Claude Code temp folder.

The texts are in `src/plugins/claudetto/slices/setup/texts.ts/automode.json`.

The destructive floor is described on the [Guards](Guards) page.
The [settings snippet](Settings-Snippet) shows the settings that setup writes.

## Related Pages

- [Settings Resolution](Settings-Resolution)
- [Guards](Guards)
- [Settings Snippet](Settings-Snippet)
- [Undocumented Reads](Undocumented-Reads)
