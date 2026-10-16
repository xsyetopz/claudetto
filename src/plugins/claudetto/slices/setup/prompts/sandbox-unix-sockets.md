The setting `sandbox.network.allowAllUnixSockets` is `true` in {{file}}.
It turns off the seccomp filter, so a sandboxed command can connect to Unix sockets, such as the socket of `ssh-agent`.
The hard stop does not change a setting that you chose.
Remove the setting or set it to `false`, and then run `/claudetto:setup sandbox` again.
Nothing changed.
