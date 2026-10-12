# Auto mode

How the auto mode classifier of Claude Code `2.1.296` decides a permission.
Auto mode runs a tool call without a prompt when the classifier allows it.
The rules in this page are the defaults of `2.1.296`.
A later version can change them.

## How the classifier decides

The classifier reads the action and its rules, and then it allows or blocks the action.

- By default, the classifier allows an action.
- It blocks an action only when the action matches a hard deny rule, or when it matches a soft deny rule and no allow rule applies.
- User intent never clears a hard deny rule.
- Explicit user direction can clear a soft deny rule, when the evidence for the direction is strong enough.

Source: the text of the classifier rules in the `2.1.296` binary.
It was found by a search of the extracted strings in `external/cc-2.1.296/strings.txt`, which git ignores.
The text is a paraphrase here.

## The four keys of `autoMode`

The `autoMode` object of the settings has four keys.
Each key takes a list of rule texts.

| Key | Meaning |
| --- | --- |
| `allow` | Exceptions to the soft deny rules. |
| `soft_deny` | Rules that block an action, unless an allow rule applies. |
| `hard_deny` | Rules that block an action, and that no user intent clears. |
| `environment` | Fields that describe your organization, and the resources that the classifier can trust. |

An entry `$defaults` in a list expands to the built-in list of that key.
A list with `$defaults` first keeps the built-in rules, and it adds your rules after them.

Source: the key names come from the output of `claude auto-mode defaults` in `2.1.296`, saved as `external/cc-2.1.296/automode-defaults.json`.
The meaning of `$defaults` was found by a search of the binary strings for the literal entry.

## Where the setting can come from

Claude Code reads `autoMode` only from the user settings, the `--settings` flag, and the managed settings.
It ignores `autoMode` in the project settings and in the local settings, because a repository controls those files.
When it ignores such a value, it writes a log event.

Source: a text in the `2.1.296` binary says that only policy, user, and flag settings can set the rules.
It was found by a search for the `untrusted_source` event names in the extracted strings.

Plugins cannot set `autoMode`.
This is inference from the `settings.json` of a plugin, which accepts only the `agent` and `subagentStatusLine` keys, as the evidence file `automode.md` says.

## The commands

| Command | What it does |
| --- | --- |
| `claude auto-mode defaults` | Prints the built-in rules. |
| `claude auto-mode config` | Prints the effective rules, which are the built-in rules with your changes. |
| `claude auto-mode critique` | Reviews your custom rules. |
| `claude auto-mode reset` | Removes `autoMode` from the user settings file. |

Source: the four handler names of the commands are in the `2.1.296` binary, found by a search of the extracted strings.
The output of the `defaults` command is the file `external/cc-2.1.296/automode-defaults.json`.

## The defaults of `2.1.296`

The built-in lists of `2.1.296` have these sizes.

| Key | Entries | Examples |
| --- | --- | --- |
| `allow` | 17 | `Local Operations`, `Read-Only Operations`, `Declared Dependencies`, `Session-Created Job Cleanup`, `Multi-Agent Coordination` |
| `soft_deny` | 72 | `Git Destructive`, `Irreversible Local Destruction`, `Unverifiable Deletion Target`, `Shared Scratch Sweep`, `Credential Leakage`, `Code That Leaks When Run` |
| `hard_deny` | 1 | `Data Exfiltration` |
| `environment` | 21 | `Trusted repo`, `Source control`, `Trusted internal domains` |

Source: the counts and the names come from `external/cc-2.1.296/automode-defaults.json`, read with a script that counts the entries of each key.
Each `soft_deny` rule names the actions that it covers, and an allow rule names the cases that clear it.
Each `environment` field is a text for you to fill in.
Most default texts of the fields say `None configured`.

## Adding your own rules

Set your rules in the user settings, and keep `$defaults` in each list that you change.
Without `$defaults`, the list replaces the built-in rules.
This is inference from the `$defaults` entry, and no test ran it.
Then run `claude auto-mode config` to check the effective rules.

Put the facts of your organization in `environment`, such as the trusted repository and the trusted domains.

## Example: a blocked worktree removal

On 2026-10-12, the classifier blocked the command `git worktree remove -f -f` with `git branch -d`.
The command removed three clean worktrees that agents made, and that were merged.
The blocking rule was `Irreversible Local Destruction`.

- The rule names `git worktree remove --force` and `rm -rf`, and it presumes that a working tree is dirty.
- The rule has a clause for an agent-created worktree or a scratch clone.
  The session did not show that it made those worktrees, because another session made them.
- `Shared Scratch Sweep` blocks a delete by a pattern in `/tmp` or in `$TMPDIR`.
  It allows the delete of a named path that the agent worked with.
- `Unverifiable Deletion Target` blocks `rm -rf` of a variable whose value the transcript does not show.

Source: the case is in `.dotclaude/spec/changes/1.0.0/evidence/automode.md`.
An entry in `environment` that names the agent worktrees and the Claude Code temp folders could let the clause apply.
This is inference, and no test ran it.

## What dotclaude writes

Setup writes to the user settings only, as the setup code says in `src/plugins/dotclaude/slices/setup/domain/automode.ts`.
For each of the four keys, setup adds `$defaults` first, and it adds the rules of the dotclaude catalog.
The `ask` rules go to `soft_deny`.
The `floor` and `subagent` rules go to `hard_deny`.
The two allow rules, for the removal of an agent worktree and for the cleanup of the Claude Code temp folder, go to `allow`.
The texts are in `src/plugins/dotclaude/slices/setup/texts.ts/automode.json`.

The destructive floor is described on the [Guards](Guards) page.
The settings that setup writes are in [Settings snippet](Settings-Snippet).

## Related pages

- [Settings resolution](Settings-Resolution)
- [Guards](Guards)
- [Settings snippet](Settings-Snippet)
- [Undocumented reads](Undocumented-Reads)
