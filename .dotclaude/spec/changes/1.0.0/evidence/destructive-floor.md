# Destructive floor: critique evidence

## Result

The critique did not produce feedback.
The `claude auto-mode critique` call now reaches the model with the login, so the earlier "Could not resolve authentication method" error no longer appears.
Each run printed "Analyzing your auto mode rules" and then "No critique was generated.
Please try again." with exit status 0.
No rule prose changed, because no feedback named a rule.

## Method

1. Removed the rule `git.force-push-branch` from the catalog `src/kernel/policy/rules/git.ts`, and ran `just generate`.
   The `ask` tier now holds only `system.privilege`.
2. Built the block with `planAutoMode` from `plugins/dotclaude/slices/setup/domain/automode.ts`, with an empty current settings object and no changes list.
   The block has four keys: `allow`, `soft_deny`, `hard_deny`, and `environment`.
3. Wrote the block as `settings.json` in the `config/` folder of a sandbox directory in the temp folder.
   The sandbox directory was an isolated `--dir` for `dotclaude-lab`'s sandbox command, so the real config folder did not change.
4. Ran `dotclaude-sandbox --dir <sandbox> auto-mode critique` from `plugins/dotclaude-lab/bin/dotclaude-sandbox`.
   The script gave `claude` the login token in its environment only, as `wiki/plugins/Sandbox.md` describes under Login.
   The token was not printed or written to a file.
5. Tried the run four more times with the debug log, with `--model sonnet`, and inside a pseudo-terminal.
   Each run gave the same result.
   The debug log holds one `[ERROR]` line, "Could not open /dev/tty for stdin override", and no API error.
6. Removed the block folder and the sandbox files that this run wrote.

## The block

| List | Entries | Source |
| --- | --- | --- |
| `hard_deny` | `$defaults`, then 19 `floor` rules and 1 `subagent` rule | `floor` and `subagent` tiers of the catalog |
| `soft_deny` | `$defaults`, then 1 `ask` rule | `ask` tier of the catalog, `system.privilege` only |
| `allow` | `$defaults`, then 2 texts of P25 | `AUTOMODE.allow` |
| `environment` | `$defaults` only | P25 |

The `hard_deny` rules are:

- `git.discard-uncommitted`, `git.clean`, `git.stash-drop`, `git.history-rewrite`, `git.force-push-default`, `git.delete-branch`, and `git.delete-repo` (`floor`).
- `git.shared-checkout` (`subagent`).
- `system.recursive-delete`, `system.disk`, `system.permissions`, and `system.security` (`floor`).
- `db.drop`, `db.truncate`, `db.unscoped-write`, `db.reset`, `db.flush`, and `db.delete-files` (`floor`).
- `cloud.destroy` and `backups.delete` (`floor`).

The `soft_deny` rule is `system.privilege` (`ask`).
The rule `git.force-push-branch` is no longer in the block, as task 1 removes it.

## Built-in defaults

`claude auto-mode defaults`, with the sandbox config folder, printed these counts in the earlier run:

| List | Built-in entries |
| --- | --- |
| `allow` | 17 |
| `soft_deny` | 72 |
| `hard_deny` | 1 |
| `environment` | 21 |

The `$defaults` entry in each list of the block expands to these built-in rules at run time.

## Critique summary per rule

Not available.
The critique did not return feedback for any rule id, so no rule id has a summary.

## Prose changes

None.
A change needs feedback that names the rule, and the critique gave none.

## Next steps

1. Re-run the critique when the model returns a result for `claude auto-mode critique`.
   The debug log of the failed runs has no API error, so the cause is not clear from the log.
2. Record the feedback for each rule id in this file.
   Apply a prose change in `src/kernel/policy/rules/` only when the change makes the rule stricter or clearer, and list it here.
