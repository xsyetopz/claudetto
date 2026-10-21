# Guard

This page tells how the `guard` slice of the core plugin `claudetto` denies a `Bash` command that only prints a file, and asks before a `git push` that deletes a remote branch.
A user reads it to learn why Claude gets a deny and what to do.
A contributor reads it before an edit of `slices/guard/`.

## Why It Exists

The `Read` tool sends a short stub when Claude reads the same range of an unchanged file again.
A `Bash` print of a file gets no stub, so the text enters the context again.
The `guard` slice denies such a print and names the `Read` call that does the same work.

The slice has one control, `print deny`.
The ask before a delete refspec has no control entry: it keeps the ask of 0.2.0 for this form, and it does not save tokens (task 4.1 of `post-0-2-0`).
Remove `print deny` when Claude Code gives the short stub for a `Bash` print too.

## What the Hook Does

The slice adds a `tool.call` hook and a `tool.check` hook on the tool `Bash`.
The `tool.call` hook is the print deny, and the `tool.check` hook is the ask in the section `Delete Refspec of git push`.
The hook runs in the phase `check`, after the `sembr` rewrite of the phase `rewrite`.
So the hook checks the command that would run.

1. The hook reads the command and splits it into parts.
2. If each part only prints a file, the hook finds the file and the line range.
3. The hook denies the call and names the `Read` call with `file_path`, `offset`, and `limit`.

If one part does other work, the call runs.
Examples of such a part are `ls`, a build, and a print that goes into a pipe.

## Which Commands Count as a Print

The hook reads these forms as a print of one file:

| Command | Range in the deny |
| --- | --- |
| `cat F` | No range |
| `sed -n A,Bp F` or `sed -n Np F` | `offset` A, `limit` B-A+1 |
| `head F`, `head -n N F`, `head -N F` | `offset` 1, `limit` N (10 by default) |
| `tail -n +N F` | `offset` N |
| `tail F`, `tail -n N F`, `tail -N F` | The last N lines (10 by default) |

A compound command is a print only when each part is a print.
The hook splits on `;`, `&&`, `||`, `|`, `&`, and new lines outside quotes.
A plain `cd DIR` is not work, and it sets the folder of the later parts.
A relative path uses the folder of the session or of the last `cd`.

## Delete Refspec of `git push`

The `tool.check` hook asks the person before a `git push` with a delete refspec, such as `git push origin :branch` or `git push origin +:branch`.
An `ask` rule of the settings cannot match this form, because Claude Code warns on an inner `:*` in a rule.
The ask has `decider: "person"`, so in each mode the dialog is the only approver.
No allow rule, classifier, or `bypassPermissions` settles it.
Where no person can be asked, Claude Code refuses the call.
The hook keeps a deny of the engine.
The hook finds the form with `git` options before `push` (`git -C dir push`), a wrapper such as `sudo`, and options before or after the remote.
It also finds the form in `$(...)`, `bash -c`, `sh -c`, `eval`, a group, and a branch of `if`.
The first plain word after `push` is the remote, and each later word that starts with `:` or `+:` is a delete refspec.
The reason of the ask says that the push deletes the remote branch.
The forms `git push origin main`, `git push origin HEAD:main`, and `git push origin a:b` run.

## When the Command Runs

The hook lets the call run in these cases:

- The command has a heredoc, an open quote, a substitution, a variable, a glob, or a redirect.
- A part prints into a pipe, or `cd` has an unknown folder.
- The file does not exist, or is not a regular file.
- The file is a generated file.
  These are files in `node_modules`, `.git`, `dist`, `build`, `target`, `coverage`, `.next`, `out`, or `__pycache__`.
  Files that end in `.log`, `.map`, `.lock`, `.min.js`, `.min.css`, `.tsbuildinfo`, `package-lock.json`, or `bun.lock` and `bun.lockb` count too.
- The file is empty and the command uses `tail` with a count.

## Large Files

The hook counts the lines of a file with the engine file reader.
A file over `READ_MAX_BYTES` (4 MiB, in `slices/guard/limits.ts`) gets no line count.
The deny then names the file with no range.
The same holds for `cat F`.

## Fail Closed

Claude Code skips a hook that throws or times out, so the call would run.
The slice adds an error handler for this case.
If the hook fails and the command prints a file, the handler denies the call and gives the kind of the failure.
The reason tells Claude to use `Read` with an `offset` and a `limit`.
A command that does not print a file runs.

## How to Turn It Off

The `guard` slice denies a `Bash` command that only prints a file.
Claude gets a `Read` call to use instead.
This saves tokens, because `Read` does not send the same text twice.

## See Also

- [Sembr](Sembr)
- [Controls](Controls)
- [Bounds](Bounds)
