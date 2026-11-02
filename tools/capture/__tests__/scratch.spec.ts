import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
	chmod,
	mkdtemp,
	readdir,
	readFile,
	rm,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { capture } from "../arm.ts";

let parent = "";
let bin = "";
let dump = "";
const path = process.env["PATH"];

beforeEach(async () => {
	parent = await mkdtemp(join(tmpdir(), "capture-scratch-"));
	bin = await mkdtemp(join(tmpdir(), "capture-bin-"));
	dump = await mkdtemp(join(tmpdir(), "capture-dump-"));
	// A `claude` that sends one request to the fake API and exits, so no model is reached and the run ends at once.
	await writeFile(
		join(bin, "claude"),
		`#!/bin/sh\ncurl -s -X POST "$ANTHROPIC_BASE_URL/v1/messages" -d '{"system":"s","messages":[]}' >/dev/null\nexit 3\n`,
	);
	await chmod(join(bin, "claude"), 0o755);
	process.env["PATH"] = `${bin}:${path}`;
});

afterEach(async () => {
	process.env["PATH"] = path;
	await Promise.all(
		[parent, bin, dump].map((d) => rm(d, { recursive: true, force: true })),
	);
});

describe("`capture` scratch root", () => {
	test("is gone after a run, and the reading still has the exit status", async () => {
		const reading = await capture("plain", undefined, {
			tempPrefix: join(parent, "capture-"),
		});

		expect(reading.code).toBe(3);
		expect(await readdir(parent)).toEqual([]);
	});

	test("is gone after a run that writes a dump, and the dump is kept", async () => {
		await capture("plain", undefined, {
			tempPrefix: join(parent, "capture-"),
			dump,
		});

		expect(await readdir(parent)).toEqual([]);
		expect(await readdir(dump)).toEqual(["plain.json"]);
		expect(
			JSON.parse(await readFile(join(dump, "plain.json"), "utf8")),
		).toEqual({
			system: "s",
			messages: [],
		});
	});
});
