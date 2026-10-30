// The one place that starts `claude`, and so the only place where a paid request can begin.
// Nothing here runs unless `session.ts` calls it, and `main.ts` reaches `session.ts` only on `--run`.

import { spawn } from "node:child_process";
import type { Event, Step } from "./events.ts";

/** The events of the stream-json `text`: each line that is a JSON object. */
export const eventsOf = (text: string): Event[] =>
	text
		.split("\n")
		.filter((l) => l.startsWith("{"))
		.map((l): Event => JSON.parse(l));

/** The run of `claude` with `args` in `cwd`, with `env` added to the env of the process. */
export const exec = (
	args: string[],
	cwd: string,
	env: Record<string, string> = {},
): Promise<Step> =>
	new Promise((resolve, reject) => {
		const child = spawn("claude", args, {
			cwd,
			env: { ...process.env, ...env },
			stdio: ["ignore", "pipe", "ignore"],
		});
		const chunks: Buffer[] = [];
		child.stdout.on("data", (c: Buffer) => chunks.push(c));
		child.on("error", reject);
		child.on("close", (code) =>
			resolve({
				code: code ?? 1,
				events: eventsOf(Buffer.concat(chunks).toString("utf8")),
			}),
		);
	});
