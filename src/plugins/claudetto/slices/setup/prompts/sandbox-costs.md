The costs of the hard stop:
- Each shell command of Claude in this checkout runs in the sandbox.
- Each connection to `github.com` and its subdomains from a shell command fails, also a read such as `git fetch` or `gh pr view`.
- A connection to a host that is not in `sandbox.network.allowedDomains` asks for approval, or fails in auto mode.
- Claude Code does not start in this checkout when the sandbox cannot start.
The hard stop does not apply to a command that you type at the `!` prompt, to MCP tools, or to hooks, because they run outside the sandbox.
