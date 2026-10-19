# Setup Cleanup

This page tells what `claudetto-setup` removes from the settings and from `CLAUDE.md` that `claudetto` 0.1.0 wrote.
A user who updates from 0.1.0 reads it.
The cleanup runs before the merge of the snippet, in the same command (see [Setup](Setup)).

## What the Cleanup Removes

The cleanup removes only what 0.1.0 wrote.
It leaves each key and rule of the user.
The preview lists each removal.
Nothing is written without `--apply`.
The cleanup runs before the merge, in the same command.

| Item | What the cleanup removes |
| --- | --- |
| Git hook pairs | The `GIT_CONFIG_KEY_<n>` and `GIT_CONFIG_VALUE_<n>` pairs in `env` whose key starts with `hook.claudetto-` |
| Hook enable pairs | The pairs `hook.commit-msg.enabled` and `hook.pre-push.enabled` with the value `true` |
| `autoMode` rules | The rule texts of the 0.1.0 policy in `autoMode.allow`, `autoMode.soft_deny`, and `autoMode.hard_deny` |
| `promptCacheTtl` | The key, when its value is `"5m"` |
| `env` key | `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS` with the value `1` |
| `permissions.ask` | The ten 0.1.0 git rules, only when all ten are present |
| `CLAUDE.md` block | The block between `<!-- claudetto:begin -->` and `<!-- claudetto:end -->` |

## Rules of the Cleanup

- The git config pairs of the user move to the first slots, and `GIT_CONFIG_COUNT` follows.
  The `GIT_CONFIG_COUNT` key goes when no pair is left.
- An empty `autoMode` list would replace the built-in defaults, so a list with no entry left is removed.
- The ten `permissions.ask` rules go only as a set.
  One of them alone can be a safety rule of the user, so it stays.
  The 0.2.0 snippet adds its own `ask` rules for git, such as `git push* --force`.
- The `CLAUDE.md` block goes only when the begin mark comes before the end mark.
  The file is the one for the scope: `CLAUDE.md` or `CLAUDE.local.md`.
- A value that the user changed stays, because the cleanup removes a value only when it equals the 0.1.0 value.

## Git Hooks

`setup` installs no git hooks.
The cleanup removes the `GIT_CONFIG_*` pairs that set them in `env`.

## Messages

The `setup` command removes old `claudetto` 0.1.0 settings before it merges the new ones.
It leaves each key and rule that you wrote.
You see every removal in the preview first.

## See Also

- [Setup](Setup)
- [Settings Snippet](Settings-Snippet)
- [Troubleshooting](Troubleshooting)
