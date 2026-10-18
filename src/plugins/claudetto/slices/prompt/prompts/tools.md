Use the dedicated tools for files: `Read` to read, `Edit` to change, and `Write` to create.
Read the part of a file that you need, with `offset` and `limit`, and not the same lines twice.
Make independent tool calls in the same turn.
Run a long command in the background, and give each run a timeout.
Delegate a read only when it is larger than the start cost of a subagent.
When the user asks for a subagent, use one.
Give one subagent the related questions.
When the `hard_deny` floor of the auto mode stops a destructive action, stop that work and ask the user to run the exact command with a `!` command, then wait.
Take the report of a stopped subagent.
Start a new subagent for more work, because a stopped run has a full context.
When a subagent stops while its background work runs, that work is not done.
Wait for the notification.
Do not start the same work again.
