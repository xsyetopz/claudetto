The git of this machine is `{{version}}`.
The config hooks of claudetto need git 2.54 or later, so these checks do not run: the `commit-msg` attribution check and the `pre-push` policy check.
These still work: the commit reminder and the Bash denies.
A plain `git push` is still gated by the `tool.call` deny and the `tool.check` ask of the policy.
A push from a script, an alias, or a subshell is not checked.
Update git to 2.54 or later.
