# Design: work with no prompts, and no destructive command

This file continues [`design.md`](design.md) and [`design-redo.md`](design-redo.md).
The user asked on 2026-10-17 for "the YOLO mode, but without system-destructive commands, or git-destructive commands, allowed", and said that "a pattern too broad will deny even safe operations".
The user also asked that `gc` not be a part: Claude deletes what it writes in its temp folder or a worktree when it no longer needs it.

## Facts from the docs of Claude Code

Read on 2026-10-17 from `code.claude.com/docs/en/` (`permission-modes.md`, `permissions.md`, `sandboxing.md`).

- The sandbox limits writes at the OS level to "The working directory, a per-user temp directory, and directories you've added", and keeps `.git/hooks`, `.git/config`, and the shell startup files write-denied (`sandboxing.md:31`, `:545`).
- "Auto-allow runs sandboxed commands without prompting" (`sandboxing.md:78`), in each permission mode but plan mode (`:205`).
- In auto-allow, "A command in a form that a `Bash` deny rule matches is still blocked", and an `rm` of a critical path still goes through the permission flow (`sandboxing.md:188-189`).
- `allowUnsandboxedCommands: false` removes the retry outside the sandbox, and Claude Code then ignores `dangerouslyDisableSandbox` (`sandboxing.md:234`).
- "Deny rules block in every mode, including `bypassPermissions`" (`permission-modes.md:30`).
- "Deny and ask rules apply when any subcommand matches them, including a command nested inside a subshell, a command substitution, or a control-flow body" (`permissions.md:227`).
- "A deny rule doesn't match the same program by path or inside `sh -c`" (`permissions.md:307`).
- `bypassPermissions` is for "Isolated containers and VMs only", and it skips the prompt for writes to `.git` and `.claude` (`permission-modes.md:24`, `permissions.md:90`).

## Decisions

### D43. The sandbox stops system damage, and exact deny rules stop git damage

- The setup snippet turns the sandbox on with `autoAllowBashIfSandboxed: true` and `allowUnsandboxedCommands: false`, in the user settings.
  The OS stops each write outside the project, the temp folder, and the cache folders of task 7.4, with no command pattern, so no safe command is denied by a pattern.
- `permissions.defaultMode` is `acceptEdits`.
  Jev picked `acceptEdits` at confidence 0.80, over `bypassPermissions` at 0.12 and `auto` at 0.01.
  Edits and sandboxed commands in the project run with no prompt.
  A write outside the project and a write to a protected path still prompt.
- Allow rules cover each read-only tool that claudetto ships and each tool that `Tools.md` (task 7.6) marks as safe with no prompt, so a normal session shows no prompt.
- A git command that destroys work in the project is denied by an exact `permissions.deny` rule: a hard reset, a forced clean, a checkout or a restore that discards changes, a forced push, a forced branch delete, a drop or clear of the stash, a reflog expiry, a prune, and a history rewrite.
  Each rule names the destructive flag, so the safe forms pass: `git reset --soft`, `git clean -n`, `git restore --staged`, `git push --force-with-lease`, and `git stash`.
- A corpus of commands decides the rules: each destructive form that must be denied, and each safe form that must pass, the commands of the transcripts of other projects included.
  A test matches the corpus against the rules by the matching that `permissions.md` describes, and the sandbox session of task 12.4 runs the corpus live.
- The `guard` hook keeps only the forms that a rule cannot match: `sh -c`, `bash -c`, `eval`, and a program by path, such as `/usr/bin/git`.
  It parses each form by D35, and the corpus is its lab.
- The asks of `asks` for a call that discards work become these deny rules, and the asks for content checks stay (D12).

- Alternative: `bypassPermissions` with the same rules.
  Rejected, because the docs scope it to containers and VMs, and it lets the `Edit` tool write to `.git` and `.claude` with no prompt.
- Alternative: `auto` mode.
  Rejected, because its classifier can block or prompt on safe actions, which the user names as the problem.

### D44. Claude removes what it writes outside the project, and `gc` goes

- The `gc` slice, its CLI `claudetto-gc`, and the command `/claudetto:gc` go.
- The system prompt text of D17 and each agent prompt give the rule: a file or a folder that Claude makes in its temp folder or a worktree that it makes is removed by Claude when the work no longer needs it, and the report names what stays.
- The built-in cleanup of a subagent worktree with no changes stays as it is.
- An eval case checks the behavior: after a task that writes to the temp folder, the folders that the task made are gone (group 11).

- Alternative: keep the sweep as a hook.
  Rejected by the user.
