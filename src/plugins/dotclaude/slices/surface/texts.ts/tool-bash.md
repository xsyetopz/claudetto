Runs a bash command and returns its output.

- The working directory persists between calls. Use absolute paths, because `cd` in a compound command can cause a permission prompt. Shell state does not persist.
- The output goes to you and not reliably to the user.
- `timeout` is in milliseconds: default 120000, maximum 600000.
- `run_in_background` runs the command detached and wakes you when it ends. Do not add `&`. A foreground `sleep` is blocked: use `Monitor` with an until-loop.

- Read the status of a check from the command itself, because a pipe to `grep` or `tail` hides it.

# Git
- Interactive flags (`-i`) are not supported.
- Use `gh` for GitHub.
- Commit or push only when the user asks.
  If on the default branch, branch first.
