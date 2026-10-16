The git guard cannot read the subcommand of this `git` call, because it comes from a variable, a substitution, or the input of `xargs`.
It can be a `git stash`, `git reset`, or `git restore` that moves or discards work that the user and other sessions share.
A command with the subcommand in its text lets the guard read it.
