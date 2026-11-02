#!/usr/bin/env -S bun --no-env-file
// Usage: bun claudekit/context-split/main.ts FILE
// Prints the parts of a captured messages request that `/context` counts as "System prompt", with the sums.
// FILE is a body, or `{ body }`, as `bun tools/capture/run.ts … --dump DIR` writes it.

import { readFile } from "node:fs/promises";
import { estimateTokens, splitContext, summarize } from "./split.ts";

const head = (text: string) => text.replace(/\s+/g, " ").slice(0, 70);
const out = (line: string) => process.stdout.write(`${line}\n`);

const file = process.argv[2];
if (file === undefined) {
	process.stderr.write("usage: bun claudekit/context-split/main.ts FILE\n");
	process.exitCode = 2;
} else {
	const parts = splitContext(JSON.parse(await readFile(file, "utf8")));
	out("== system blocks");
	for (const p of parts.filter((q) => q.source === "system")) {
		out(`  ${estimateTokens(p.chars)} | ${head(p.text)}`);
	}
	out("== text parts of the messages");
	for (const p of parts.filter((q) => q.source !== "system")) {
		out(`  ${p.source} ${estimateTokens(p.chars)} | ${head(p.text)}`);
	}
	const { system, reminders } = summarize(parts);
	out(
		`== system ${estimateTokens(system)}; reminders ${estimateTokens(reminders)}; sum ${estimateTokens(system + reminders)}`,
	);
}
