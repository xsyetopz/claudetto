# Probe for Tasks 19.12 and 19.13

One paid `claude -p` run on 2026-10-26, Claude Code 2.1.310, `--model claude-sonnet-5-5`, `--max-budget-usd 1`. Total cost: `total_cost_usd` 0.0936169, 5 turns, `subtype` `success`. No second run.

Setup: a test plugin with `--plugin-dir`, `--setting-sources ""`, and `--settings` with `sandbox.enabled: true`, `sandbox.filesystem.denyRead: ["/tmp/p1912/.env"]`, `sandbox.filesystem.denyWrite: ["/tmp/p1912/locked"]`. The mod set `CLAUDE_CODE_BASH_EDIT_DIFF=1` with `$.env.set` at `session.start`. It wrote each `Bash` `PostToolUse` input with `$.fs.read` and `$.fs.write` (they work, no `$.process.run` needed).

## 19.12: `bashEditDiff`

Step a (`python3` write of `b.txt`) had the field in `tool_response`, but it did not report the change:

```json
"bashEditDiff": {"files": [], "moreFiles": 0, "unavailable": true}
```

- Keys: `files` (array, empty here), `moreFiles` (number, `0`), `unavailable` (boolean, `true`).
- `b.txt` held `two` after the run, so the write happened and the field missed it.
- The field exists, so Claude Code read the variable after the start, or the field is on by default in this build. The probe cannot tell which.
- The reason for `unavailable: true` is not known. It can be the sandbox, the `python3` write, or the late `$.env.set`. A run with no sandbox would tell. That is a second paid run, so it was not done.
- Shape of `files` items and of `skipped` is not seen.
- Only step a reached `PostToolUse`. Steps b and d failed with exit 1, so they gave no line in `post.jsonl`.
- Result for the task: with `unavailable: true` the rule must use the hash fallback. `bashEditDiff` cannot replace the mtime scan of `session.ledger` as far as this probe shows.

## 19.13: sandbox

- Step b (`python3` read of `.env`): denied. Error: `PermissionError: [Errno 1] Operation not permitted: '.env'`.
- Step c (`Edit` of `locked/a.txt`): allowed. Result: `The file /private/tmp/p1912/locked/a.txt has been updated successfully.` The file held `two` after the run, so `Edit` writes under `denyWrite`.
- Step d (`python3` write of `locked/a.txt`): denied. Error: `PermissionError: [Errno 1] Operation not permitted: 'locked/a.txt'`.
- Result for the task: `denyRead` stops a `Bash` read, `denyWrite` stops a `Bash` write, and `Edit` stays allowed. `Write` was not tested.
- Path form: absolute paths in `sandbox.filesystem.*` worked. The tool shows the real path `/private/tmp/...`.

## Second Probe: No Sandbox, in a Git Repo

One more paid `claude -p` run on 2026-10-26 (the user approved it), `total_cost_usd` 0.0743606, `subtype` `success`.
The setup was the same plugin with the mod `$.env.set` of `CLAUDE_CODE_BASH_EDIT_DIFF`, `--settings` `{}` (no sandbox), and `/tmp/p1912` as a git repo with one committed file `a.txt`.

| Step | `bashEditDiff` |
|---|---|
| `python3` write of the tracked `a.txt` | `files[0]`: `filePath`, `hunks` (`-one`, `+two`), and `changedFiles: ["/private/tmp/p1912/a.txt"]` |
| `python3` write of the new `b.txt` | `created: true`, `changedFiles: ["/private/tmp/p1912/b.txt"]` |
| `printf` write of the new `c.txt` | `created: true`, `changedFiles: ["/private/tmp/p1912/c.txt"]` |

- The `$.env.set` at `session.start` is early enough.
- A `python3` write is reported. So the `unavailable: true` of the first probe comes from the sandbox or from the folder that was not a git repo. These two runs cannot tell which.
- The paths are real paths (`/private/tmp/...`), so the rule must compare real paths.
- Result for 19.12: keep `bashEditDiff` first, and use the hash fallback when `unavailable` is `true` or the field is missing.

## Local Tests of the Sandbox Runtime for 19.13

These are free runs of `srt` (`@anthropic-ai/sandbox-runtime` 0.0.81) on 2026-10-26, on macOS and in a `node:22-bookworm` container with `bubblewrap`. The gate stops a command that names a `.env` file, so the glob tests used a dummy name `.tok` with the same pattern form.

| Settings | macOS | Linux |
|---|---|---|
| `denyRead: ["**/.tok", "**/.tok.*"]` and `allowRead: ["**/.tok.example"]` | `.tok` (top level and subfolder) and `.tok.local` denied, `.tok.example` read | the same |
| `denyWrite: [W]` and `allowWrite: [W, W/local]` | `W/x` and `W/local/y` denied | not run |
| `denyRead: ["**/.env"]` with `bun a.ts` in a folder that has a `.env` file | `bun` exits 1 with no output. With no deny, it prints `ran 1` | not run |

- `denyWrite` wins over `allowWrite`, so setup lists each entry of `/usr` except `/usr/local`, and does not list `/usr` itself.
- A `**/.env` deny breaks `bun` and each tool that loads `.env` on its own, so setup writes no `.env` entry (Jev for the user, 2026-10-26, confidence 0.83). The gate still stops each command that names a `.env` file.

## Can `bashEditDiff` Replace the mtime Scan of `session.ledger`? (Task 19.12)

No. In a sandbox or in a folder that is not a git repo the field is `{ files: [], moreFiles: 0, unavailable: true }` although a write happened, and it lists only paths, with no `session` or `agent`, so `session.ledger` keeps its `git status` and mtime scan (`modules/session/hygiene/adapters/mod.ts`).
The rule `work.bash-undo` uses the field when it is usable (no `unavailable`, no `skipped`, `moreFiles` 0) and compares the saved content with the current content otherwise.
