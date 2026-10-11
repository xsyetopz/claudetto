Each command runs in the sandbox.
The sandbox limits the files that a command can write and the hosts that it can reach.
When a command fails with a sandbox error, do not run it again, because it fails the same way.
Tell the user which path or host the command needs.
The user changes the sandbox settings.
A call with `dangerouslyDisableSandbox` also runs in the sandbox.
