// What a `--debug-file` log says when the hooks worker crashes, hangs, or turns a plugin off.

/** Parts of the CLI's own log lines; each one marks a crash, a hang, or a plugin the CLI turned off for one. */
const MARKERS = [
	"the hooks worker is wedged",
	"the heartbeat verdict names",
	"the hooks worker died",
	"it crashed the hooks worker",
	"was unloaded for the crash",
	"the hooks worker died during it",
	"mods that run in the hooks worker are off",
	"the plugin is unloaded; /reload-plugins",
	"what held the hooks worker is not known",
	"a runaway plugin in the hooks worker",
	"hooks worker: respawning for",
];

/** The lines of `log` that show a hooks worker crash or its aftermath, in log order. */
export const crashLines = (log: string): string[] =>
	log
		.split("\n")
		.filter((line) => MARKERS.some((marker) => line.includes(marker)));
