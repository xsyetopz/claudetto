// The `permissions.ask` rules for a git call that destroys work (design D43).
// A rule matches the whole subcommand, and `*` stands for any text.
// Each rule names the destructive flag, so `git reset --soft`, `git clean -n`, `git restore --staged`, and `git push --force-with-lease` pass.
// A rule cannot match `sh -c`, a program by path, an option before the subcommand, or a reordered short flag, so the `guard` hook keeps those.

export const GIT_ASK = [
  "Bash(git push* -f*)",
  "Bash(git push* --force)",
  "Bash(git push* --force *)",
  "Bash(git reset* --hard*)",
  "Bash(git clean* -*f*)",
  "Bash(git checkout .)",
  "Bash(git checkout* -- *)",
  "Bash(git restore .)",
  "Bash(git restore -- *)",
  "Bash(git restore* --worktree*)",
  "Bash(git branch* -D*)",
  "Bash(git stash drop*)",
  "Bash(git stash clear*)",
  "Bash(git reflog expire*)",
  "Bash(git gc* --prune*)",
  "Bash(git prune*)",
  "Bash(git filter-*)",
];
