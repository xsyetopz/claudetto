#!/usr/bin/env -S bun --no-env-file
// Usage: bun claudekit/bash-once/main.ts COMMAND [SETTINGS.json] [--settings JSON] [--hook COMMAND] [--plugin-dir DIR] [--permission-mode MODE]
// Runs `COMMAND` once as `Bash` in a `claude -p` session against the fake API under the given settings and
// prints the `tool_result`: the output, a denial by a rule, or the ask. With no settings, `Bash` is allowed.

import { readFile } from "node:fs/promises";
import { parseArgs } from "./args.ts";
import { captureBashOnce } from "./run.ts";

const MAX_CHARS = 200;

const args = parseArgs(process.argv.slice(2));
const text =
	args.settings ??
	(args.file === undefined
		? JSON.stringify({ permissions: { allow: ["Bash"] } })
		: await readFile(args.file, "utf8"));
const out = await captureBashOnce({
	command: args.command,
	settings: JSON.parse(text),
	...(args.hook === undefined ? {} : { hook: args.hook }),
	...(args.pluginDir === undefined ? {} : { pluginDir: args.pluginDir }),
	...(args.permissionMode === undefined
		? {}
		: { permissionMode: args.permissionMode }),
});
process.stdout.write(
	`${args.command.slice(0, 60)}\n  -> ${JSON.stringify(out.result).slice(0, MAX_CHARS)}\n  classifier requests: ${out.classifierRequests}, with the command: ${out.classifierSawCommand}\n`,
);
