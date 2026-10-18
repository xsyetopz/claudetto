// The `permissions.ask` rules for a git call that destroys work (design D43).
// A rule matches the whole subcommand, and `*` stands for any text.
// Each rule names the destructive flag, so `git reset --soft`, `git clean -n`, `git restore --staged`, and `git push --force-with-lease` pass.
// `git clean* -*f*` also asks for `git clean -n src/foo.ts`, and `*` reaches across `&&` in the whole-command test.
// Accepted: both are extra prompts.
// A rule cannot match `sh -c`, a program by path, an option before the subcommand, or a reordered short flag, so the `guard` hook keeps those.

export const GIT_ASK = [
  "Bash(git push* -f*)",
  "Bash(git push* --force)",
  "Bash(git push* --force *)",
  "Bash(git push* --delete*)",
  "Bash(git push* :*)",
  "Bash(git push* --mirror*)",
  "Bash(git reset* --hard*)",
  "Bash(git clean* -*f*)",
  "Bash(git checkout .)",
  "Bash(git checkout* -- *)",
  "Bash(git restore .)",
  "Bash(git restore -- *)",
  "Bash(git restore* --worktree*)",
  "Bash(git restore* -W*)",
  "Bash(git restore* --source*)",
  "Bash(git branch* -D*)",
  "Bash(git branch* --force*)",
  "Bash(git checkout* -f*)",
  "Bash(git stash drop*)",
  "Bash(git stash clear*)",
  "Bash(git reflog expire*)",
  "Bash(git reflog delete*)",
  "Bash(git gc* --prune*)",
  "Bash(git prune*)",
  "Bash(git filter-*)",
];
