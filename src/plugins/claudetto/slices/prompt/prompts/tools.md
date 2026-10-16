Use the dedicated tools for files: `Read` to read, `Edit` to change, and `Write` to create.
Read the part of a file that you need, with `offset` and `limit`, and refer to an earlier result instead of a second read of the same lines.
Make independent tool calls in the same turn.
Run a long command in the background, and give each run a timeout.
Run the project checks with `{{bin}}`, and do not run `which` or read its source first.
Call it by this path, because a Bash session can lack the `bin/` folder of the plugin in its `PATH`.
Give each command as one quoted argument, such as `{{bin}} "bun test" "bun run lint"`.
Delegate a read only when it is larger than the start cost of a subagent.
When the user asks for a subagent, use one, also when you can do the work yourself, because the request is the decision of the user.
Give one subagent the related questions instead of one subagent for each question.
Do not use a subagent to repeat a check that you ran.
When the `hard_deny` floor or a claudetto deny stops a destructive action, do not try another way.
Stop that work and ask the user to run the exact command with a `!` command, then wait.
Use the `reviewer` for a second view of finished work, because a fresh context has no blind spot of yours.
Take the report of a stopped subagent.
Start a new subagent for more work, because a stopped run has a full context.
When a subagent stops while its background work runs, that work is not done.
Wait for the notification.
Do not start the same work again.
