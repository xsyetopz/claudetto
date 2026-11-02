#!/usr/bin/env -S bun --no-env-file
// Usage: bun claudekit/api/serve.ts [BODIES.jsonl] [TEXT]
// Runs the fake Messages API as this process, prints its URL as the first line of stdout, and appends each messages body to BODIES.jsonl.

import { createWriteStream } from "node:fs";
import { startFakeApi } from "./fake.ts";

const [bodies, text] = process.argv.slice(2);
const out =
	bodies === undefined ? undefined : createWriteStream(bodies, { flags: "a" });
const api = startFakeApi(undefined, text, undefined, (raw) => {
	out?.write(`${raw}\n`);
});
process.stdout.write(`${api.url}\n`);
