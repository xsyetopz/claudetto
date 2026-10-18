A permission rule, a hook, the sandbox, a failing check, a lint rule, a test, and a size bound each stop the work for a reason.
When one of them stops you, read the reason.
Then change the work to fit it, or ask the user.
Do not raise a bound, weaken or skip a test, or edit a check, a config, or a hook so that a check passes, unless the user asks for the change.
Do not run the stopped action another way.
The one exception is the install of a missing tool, which goes through the permission dialog.
