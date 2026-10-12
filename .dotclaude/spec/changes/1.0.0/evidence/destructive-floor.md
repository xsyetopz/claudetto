# Destructive floor: critique evidence

## Result

The critique did not run.
The `claude auto-mode critique` call failed with "Could not resolve authentication method".
The sandbox config folder has no login, and this run did not read the login of the user.
No rule prose changed in this run.
The critique needs a re-run with a login, as described under Next steps.

## Method

1. Ran `just generate` in the worktree.
   The setup block comes from `planAutoMode` in `plugins/dotclaude/slices/setup/domain/automode.ts`, with an empty current settings object.
   The block has four keys: `allow`, `soft_deny`, `hard_deny`, and `environment`.
2. Wrote the block as `settings.json` in the sandbox config folder, `$TMPDIR/dotclaude-sandbox/config/`, which `just sandbox` uses.
   The file is the block that setup writes, so it has no other key.
3. Ran `claude auto-mode defaults` with `CLAUDE_CONFIG_DIR` set to that folder.
   It exited 0 and printed the built-in lists.
4. Ran `claude auto-mode critique` with the same `CLAUDE_CONFIG_DIR`.
   It exited 1 with the message in Result.
5. Removed `settings.json` and the `seed-admin` folder that the Claude Code run created.
   A file list of the config folder, taken before the run and after the cleanup, matches.

The sandbox script sets `HOME` and the login token.
This run set only `CLAUDE_CONFIG_DIR`, so `HOME` stayed the real home folder.
The run did not read the Keychain entry or the credentials file.

## The block

| List | Entries | Source |
| --- | --- | --- |
| `hard_deny` | `$defaults`, then 19 `floor` rules and 1 `subagent` rule | `floor` and `subagent` tiers of the catalog |
| `soft_deny` | `$defaults`, then 2 `ask` rules | `ask` tier of the catalog |
| `allow` | `$defaults`, then 2 texts of P25 | `AUTOMODE.allow` |
| `environment` | `$defaults` only | P25 |

The `hard_deny` rules are:

- `git.discard-uncommitted`, `git.clean`, `git.stash-drop`, `git.history-rewrite`, `git.force-push-default`, `git.delete-branch`, and `git.delete-repo` (`floor`).
- `git.shared-checkout` (`subagent`).
- `system.recursive-delete`, `system.disk`, `system.permissions`, and `system.security` (`floor`).
- `db.drop`, `db.truncate`, `db.unscoped-write`, `db.reset`, `db.flush`, and `db.delete-files` (`floor`).
- `cloud.destroy` and `backups.delete` (`floor`).

The `soft_deny` rules are `git.force-push-branch` and `system.privilege` (`ask`).

## Built-in defaults

`claude auto-mode defaults`, with the sandbox config folder, printed these counts:

| List | Built-in entries |
| --- | --- |
| `allow` | 17 |
| `soft_deny` | 72 |
| `hard_deny` | 1 |
| `environment` | 21 |

The `$defaults` entry in each list of the block expands to these built-in rules at run time.
The built-in lists are present, so the `$defaults` entry has rules to expand.

## Critique summary per rule

Not available.
The critique did not return feedback for any rule.

## Next steps

1. Log in to the sandbox with `/login`, or set `CLAUDE_CODE_OAUTH_TOKEN` as the sandbox script does.
   Get the approval of the user first, as the sandbox page requires.
2. Write the block to the sandbox config folder as in step 2, and run `claude auto-mode critique` again.
3. Record the feedback for each rule id in this file.
   Apply a prose change in `src/kernel/policy/rules/` only when the change makes the rule stricter or clearer, and list it here.
