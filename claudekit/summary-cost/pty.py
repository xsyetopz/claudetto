"""Runs one Claude Code session on a pty and writes everything it drew to a file.

A pty is what makes the session interactive, and only an interactive session can run the agent
status-line summarizer: `enableSummarization` is `wEe()||(Get()||B||ace())&&!Se()` in `2.1.312`,
`Se()` is `!isInteractive()`, and `Alt` turns interactivity off when `-p` or `--print` is given or
when `!process.stdout.isTTY`.

`script` cannot do this job here. BSD `script` reads the terminal settings of its own stdin, so it
exits 1 and writes nothing when a parent hands it a pipe, which is every parent that is not itself
a terminal. This opens the pty itself and so needs no terminal above it.

Nothing is typed into the session: the one dialog that would block it, the folder-trust question, is
answered before the launch by `trust.ts`.

Usage: `python3 -I pty.py <capture-file> <deadline-seconds> <command> [args...]`
"""

import os
import pty
import select
import signal
import sys
import time


EXIT_GRACE_S = 10.0


def pump(pid: int, master: int, out, until: float) -> bool:
    """Copies the pty to `out` until `until`, and says whether the child let go first."""
    while time.monotonic() < until:
        ready, _, _ = select.select([master], [], [], 0.5)
        if ready:
            try:
                chunk = os.read(master, 65536)
            except OSError:
                # The pty reports `EIO` once the child has let go of the other end.
                return True
            if not chunk:
                return True
            out.write(chunk)
        if os.waitpid(pid, os.WNOHANG)[0] == pid:
            return True
    return False


def main() -> int:
    capture, deadline_s, *command = sys.argv[1:]
    deadline = time.monotonic() + float(deadline_s)

    pid, master = pty.fork()
    if pid == 0:
        # The child: its stdin, stdout and stderr are the pty, so `isatty` holds for each.
        os.execvp(command[0], command)
        return 1  # Unreachable: `execvp` replaces this process or raises.

    with open(capture, "wb", buffering=0) as out:
        gone = pump(pid, master, out, deadline)
        # A session with a prompt does not exit when its turn ends, so the deadline ends it. The kill is
        # skipped once the child is gone, because its pid can already belong to another process.
        if not gone:
            try:
                os.kill(pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
            # Claude Code draws to the pty while it exits, and blocks once no one reads it.
            gone = pump(pid, master, out, time.monotonic() + EXIT_GRACE_S)
        if not gone:
            try:
                os.kill(pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
    try:
        os.waitpid(pid, 0)
    except ChildProcessError:
        pass
    os.close(master)
    return 0


if __name__ == "__main__":
    sys.exit(main())
