#!/usr/bin/env -S bun --no-env-file
// Usage: bun claudekit/bash-once/main.ts COMMAND [SETTINGS.json] [--settings JSON] [--hook COMMAND]
// Runs `COMMAND` once as `Bash` in a `claude -p` session against the fake API under the given settings and
// prints the `tool_result`: the output, a denial by a rule, or the ask. With no settings, `Bash` is allowed.

import { readFile } from "node:fs/promises";
import { parseArgs } from "./args.ts";
import { runBashOnce } from "./run.ts";

const MAX_CHARS = 200;

const args = parseArgs(process.argv.slice(2));
const text =
	args.settings ??
	(args.file === undefined
		? JSON.stringify({ permissions: { allow: ["Bash"] } })
		: await readFile(args.file, "utf8"));
const out = await runBashOnce({
	command: args.command,
	settings: JSON.parse(text),
	...(args.hook === undefined ? {} : { hook: args.hook }),
});
process.stdout.write(
	`${args.command.slice(0, 60)}\n  -> ${JSON.stringify(out).slice(0, MAX_CHARS)}\n`,
);
