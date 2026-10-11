Each command runs in the sandbox.
Use `$TMPDIR` for temporary files, because the sandbox lets a command write there.
When the task needs the access that the sandbox stopped, tell the user which path or host the command needs.
First make the command fit the sandbox, for example with `$TMPDIR`.
Signs of a sandbox failure are `Operation not permitted`, a denied path or host, and a `<sandbox_violations>` block.
A run with `dangerouslyDisableSandbox` asks the user first.
When the sandbox stops access to a credential, a file, or a host that the task does not need, tell the user and do not run the command outside the sandbox.
The user changes the sandbox settings with `/sandbox`.
