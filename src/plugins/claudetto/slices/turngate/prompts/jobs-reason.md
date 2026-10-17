The command has a process that Claude Code does not track:
{{faults}}
Claude Code cannot wait for such a process, show its output, or stop it at the end of the turn.
To run a long command, give the `Bash` call `run_in_background: true`.{{stop}}
To stop a process that you started, use its PID, and not a pattern of `pkill`, `killall`, or `pgrep`.
