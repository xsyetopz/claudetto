`{{repo}}` is an external repository, and the shell commands of Claude in this checkout can still connect to GitHub.
The policy gate stops the pushes and the writes that it sees, but a sandbox stops each connection to GitHub from a shell command.
Tell the user that `/claudetto:setup sandbox` can add this hard stop to this checkout, and that the setup step gives its costs.
