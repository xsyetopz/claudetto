# Confine

The `confineEnabled` option confines the writes of every `Bash` command at the operating system level. It ships `off`.

## How it works

On `session.start`, the `confine` block sets `CLAUDE_CODE_SHELL_PREFIX` to `bin/claudetto-confine` and `CLAUDETTO_CONFINE_ROOT` to the session's working folder. Claude Code applies the prefix to the command string after the permission check, the deny rules, the `PreToolUse` hooks, and the auto mode classifier. These all judge the command the model wrote, not a rewrite.

A relay through an MCP tool or a rewrite in `tool.call` does not keep this: a rewritten command is judged in its rewritten form, and a relay gave the classifier no request. A capture against the fake API on `127.0.0.1` under `--permission-mode auto` gave 10 classifier requests with `confine` off and 10 with it `on`, and every one carried the original command.

A `tool.call` guard on `Bash` denies the call when the prefix is not ours, or when `claudetto-confine --check --` fails. The check starts the sandbox on a command that does nothing (`sandbox-exec -f PROFILE ... /usr/bin/true` on macOS, `bwrap ... true` on Linux, with the flags of the real call), so it fails when the sandbox cannot start, and when the project folder is refused (below). It takes the two arguments `--check --`, so a command string `--check` is run as a command. A guard that fails also denies, so a broken check does not run the command unconfined.

## What a command can write

- The project folder, including `.git`, apart from `.git/hooks` and `.git/config`, which stay read-only even when they do not exist yet. `.git` itself cannot be moved or removed, so `mv .git .git.x; git init` fails. On Linux the script makes an empty `.git/hooks` and `.git/config` first when the project has a `.git` folder without them, and binds `~/.bun` and `~/.cache` after it makes them, because a bind needs the folder.
- `/tmp`, `$TMPDIR`, `~/.bun`, `~/.cache`, and on macOS `~/Library/Caches` and the per-user temporary folder. `/tmp` is writable by design, so a command can delete files there.
- The device nodes a shell needs.

A project folder that is `/`, the home folder, or a folder that holds the home folder is refused with exit 126, because it would make the whole home writable. Everything else is refused: `~/.ssh`, `~/.gitconfig`, `/etc`, the rest of the home folder, and other folders. Reads and the network are not confined. The working folder persists across calls, because `pwd -P >| FILE` into `/tmp` works.

Hook commands and the status line also run under the prefix, as do `Monitor` shells.

## Not covered

- A worktree's `.git` file points outside the project, so its writes are refused.
- Folders added with `--add-dir` are read-only.
- Reads: `cat ~/.ssh/id_ed25519` still works.
- `~/.bun/bin` is on `PATH` and `~/.bun` is writable, so a confined command can plant an executable there that a later call or the user runs unconfined. `~/.cache` and `~/Library/Caches` work the same way. A rule cannot close this without breaking `bun install` and the tool caches.
- Only file writes are confined. A connect to a Unix socket is not a file write, so a confined command can reach a socket such as the Docker socket.
- `/dev/ptmx` is not writable, so a tool that opens a pty (`script`, `expect`, some test runners) fails under the profile.
- `mv .git .git.x; git init` is refused, but a project without a `.git` folder can still run `git init` and get a fresh `hooks` and `config` that no rule covers.

## Platforms

- macOS: `/usr/bin/sandbox-exec`, which ships with the system. It cannot nest, so the built-in `sandbox` setting must be off. See [sandbox.md](sandbox.md).
- Linux: `bwrap` from `bubblewrap`, and a kernel that allows user namespaces. In a container, that means a relaxed seccomp profile, such as `--security-opt seccomp=unconfined` and `--cap-add SYS_ADMIN`.
- Other systems: every call is refused.

The `bwrap` call mounts `--proc /proc` without `--unshare-pid`. It starts as an unprivileged user in a container with `seccomp=unconfined`, with or without `SYS_ADMIN`. With `--unshare-pid` it fails there with `Can't mount proc on /proc: Operation not permitted`, because the container masks parts of `/proc`. A default Docker container refuses any user namespace, so `--check` exits 126 there.

When `bwrap` is missing, the script prints `` `bwrap` is missing; install `bubblewrap` ... The command was not run. `` and exits 126. It never runs the command unconfined. The same holds when `bwrap` is present but cannot create a namespace: `--check` exits 126 and the guard denies the call.

## Cost

The prefix adds one process per call, about 27 ms on macOS measured over 20 runs. The guard adds one `--check` process, about 18 ms when it measured only that `sandbox-exec` exists. The check now also starts a sandbox, so that figure is old and not re-measured. The first request was 39,711 characters with `confine` off and on, measured on 2026-11-02 with `bun tools/capture/run.ts --arm plugin --interactive` and the shipped settings, because the option changes the shell prefix and not the request. After the prompt rewrites of the same day it reads 39,785 with `confine` off; the reading with it on was not repeated.

## Check

`bun test plugins/claudetto/src/blocks/confine` runs the script against destructive probes (`shutil.rmtree`, `rm -rf`, `find -delete`) on a scratch folder in the home folder, and the missing-tool refusal. `bun claudekit/bash-once/main.ts COMMAND --plugin-dir plugins/claudetto --permission-mode auto --settings JSON` counts the classifier requests.
