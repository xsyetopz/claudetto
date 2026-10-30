// The one place that starts `claude` for the probe, and so the only place where a paid request can begin.
// Nothing here runs unless `session.ts` calls it, and `main.ts` reaches `session.ts` only on `--run`.

import { claudeArgv } from "../../session/argv.ts";
import { spawnCommand } from "../../session/command.ts";
import type { Event, Step } from "./events.ts";

/** The events of the stream-json `text`: each line that is a JSON object. */
export const eventsOf = (text: string): Event[] =>
	text
		.split("\n")
		.filter((l) => l.startsWith("{"))
		.map((l): Event => JSON.parse(l));

/** The run of `claude` with `args` in `cwd`, with `env` added to the env of the process; a program that cannot start rejects. */
export const exec = async (
	args: string[],
	cwd: string,
	env: Record<string, string> = {},
): Promise<Step> => {
	const ran = await spawnCommand(claudeArgv(args), { cwd, env });
	if (ran.code === undefined) {
		throw new Error(ran.stderr);
	}
	return { code: ran.code, events: eventsOf(ran.stdout) };
};
