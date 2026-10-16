The seccomp filter of the sandbox is not installed.
Without it, a sandboxed command can connect to Unix sockets, such as the socket of `ssh-agent`.
On WSL2, it can also start a Windows program, such as `git.exe`, which has the Windows credentials.
So the hard stop needs the filter on Linux and WSL2.
Claude Code looks for the program `apply-seccomp` in `sandbox.seccomp.applyPath`, and then in a global install of `@anthropic-ai/sandbox-runtime`.
Nothing changed.
