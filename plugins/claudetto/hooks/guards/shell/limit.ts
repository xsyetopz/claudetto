const DEFAULT_MINUTES = 30;

/**
 * A watchdog that perl forks off: it sleeps, then stops the call's process
 * group. Claude Code starts each Bash call as its own group leader, so the
 * group is that call's tree and nothing else. perl forks instead of the shell's
 * `&` because zsh renices `&` jobs, which the sandbox refuses, and bash prints
 * a job notice. stderr stays open so the reason reaches the model; the
 * wrapper stops the watchdog when the command ends, so the call never waits
 * on it. Stock macOS ships perl but no `timeout`.
 */
const WATCHDOG = String.raw`perl -e 'my $t = shift; my $g = getpgrp(); my $p = fork; if ($p) { print $p; exit } close STDIN; close STDOUT; $SIG{TERM} = sub { exit 0 }; sleep $t; $SIG{TERM} = "IGNORE"; print STDERR "claudetto stopped this command and its child processes after its time limit of $t seconds (option bashTimeLimitMinutes). Run long work with its own time bound or in smaller steps.\n"; kill "TERM", -$g'`;

/** The limit in minutes; a missing or invalid option gives the default, 0 turns the limit off. */
export const minutes = (value: unknown): number =>
	typeof value === "number" && Number.isFinite(value) && value >= 0
		? value
		: DEFAULT_MINUTES;

/**
 * Runs a Bash command under a wall-time limit. The command stays in the
 * session's shell, so a `cd` holds, and its own exit status is the result. An
 * EXIT trap stops the watchdog when the call's shell ends, so no line follows
 * the command. Claude Code cannot split a command that holds a brace group or
 * a subshell into subcommands, such as `{ cmd }` or `(exit $s)`, and a
 * PreToolUse hook then ignores its `if` rule and runs for every call.
 *
 * @param command The Bash command as it reaches the tool.
 * @param seconds The limit after which the command's process tree gets SIGTERM.
 * @returns The command behind a watchdog that the shell's exit stops.
 */
export const limitCommand = (command: string, seconds: number): string =>
	[
		`__claudetto_w=$(${WATCHDOG} ${Math.round(seconds)})`,
		"trap 'kill $__claudetto_w 2>/dev/null' EXIT",
		command
	].join("\n");
