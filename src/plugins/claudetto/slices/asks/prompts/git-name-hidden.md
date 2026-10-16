The git guard cannot read the name of a command in this call, because it comes from a variable or a substitution.
The command can be a `git stash`, `git reset`, or `git restore` that moves or discards work that the user and other sessions share.
A command with its name in the text lets the guard read it.
