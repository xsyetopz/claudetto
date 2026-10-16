The command is longer than {{scanMax}} characters, so the write guard cannot read all of it.
It can write a protected path in the part that it does not read.
Shorter commands let the guard read each one.
