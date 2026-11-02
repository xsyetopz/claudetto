#!/usr/bin/env -S bun --no-env-file
// Usage: bun claudekit/gc/main.ts [--hours N] [--dry-run]
// Removes the `mkdtemp` scratch folders that dev tools left in the temp folder and in `/tmp`: only a real directory
// with a known prefix and 6 characters, older than `N` hours (default 24; 0 removes nothing), that no process has as its
// cwd and that holds no live `tmux.sock`. `--dry-run` lists them with a total size and removes nothing.

import { parseArgs } from "./args.ts";
import { collect } from "./collect.ts";

const args = parseArgs(process.argv.slice(2));
const result = await collect(args);
for (const entry of result.entries) {
	console.info(`${entry.bytes}\t${entry.path}`);
}
const verb = result.removed ? "removed" : "would remove";
console.info(
	`gc ${verb} ${result.entries.length} folders, ${result.bytes} bytes${args.hours === 0 ? " (`--hours 0` turns it off)" : ""}`,
);
