Setup found no `git` program.
The config hooks of claudetto need git 2.54 or later, so these checks do not run: the `commit-msg` attribution check and the `pre-push` policy check.
These still work: the commit reminder and the Bash denies.
A plain `git push` is still gated by the `tool.call` deny and the `tool.check` ask of the policy.
Install git 2.54 or later.
