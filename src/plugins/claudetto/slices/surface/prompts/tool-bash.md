Runs a bash command and returns its output.

- The working directory persists between calls. Use absolute paths, because `cd` in a compound command can cause a permission prompt. Shell state does not persist.
- The output goes to you and not reliably to the user.
{timeout}
{background}

- Read the status of a check from the command itself, because a pipe to `grep` or `tail` hides it.

# Git
- Interactive flags (`-i`) are not supported.
- Use `gh` for GitHub.
- Commit or push only when the user asks.
  If on the default branch, branch first.
{machines}
