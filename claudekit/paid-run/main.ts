#!/usr/bin/env -S bun --no-env-file
// Usage: bun claudekit/paid-run/main.ts BODIES.jsonl [WARM_INDEX]
// Replays the planned request bodies of BODIES.jsonl on the fake API and prints each request's tokens and prefix against the warm one. It makes no paid call.

import { readFile } from "node:fs/promises";
import { replayRun } from "./count.ts";

const [file, warm] = process.argv.slice(2);
if (file === undefined) {
	throw new Error("usage: main.ts BODIES.jsonl [WARM_INDEX]");
}
const planned = (await readFile(file, "utf8"))
	.split("\n")
	.filter((line) => line !== "")
	.map((line): unknown => JSON.parse(line));
const run = await replayRun(planned, {
	warm: warm === undefined ? 0 : Number(warm),
});
const lines = run.rows.map(
	({ index, tokens, prefix: { tools, system, messages } }) =>
		`#${index} tokens=${tokens} tools=${tools} system=${system} messages=${messages}`,
);
process.stdout.write(`${[...lines, `total tokens=${run.total}`].join("\n")}\n`);
