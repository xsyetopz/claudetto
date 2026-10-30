import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { main } from "../main.ts";
import type { Runners } from "../round/round.ts";

/** Runners that fail the test when reached, so a refusal is shown to make no call. */
const calls: string[] = [];
const runners: Runners = {
	base: () => {
		calls.push("base");
		return Promise.reject(new Error("base reached"));
	},
	fork: () => {
		calls.push("fork");
		return Promise.reject(new Error("fork reached"));
	},
};

let root = "";
beforeEach(async () => {
	calls.length = 0;
	root = await mkdtemp(path.join(os.tmpdir(), "probe-weekly-"));
});
afterEach(async () => {
	await rm(root, { recursive: true, force: true });
});

describe("the seven-day reading", () => {
	test("a paid run at 100% used is refused before any call", async () => {
		const out: string[] = [];

		const code = await main(
			["--run", "--dir", root],
			runners,
			(s) => out.push(s),
			() => Promise.resolve(100),
		);

		expect(code).toBe(1);
		expect(calls).toEqual([]);
		expect(out.join("")).toContain("100.0% used");
	});

	test("a dry run names the figure when there is a reading", async () => {
		const out: string[] = [];

		await main(
			[],
			runners,
			(s) => out.push(s),
			() => Promise.resolve(37.5),
		);

		expect(out.join("")).toContain("37.5% used");
	});

	test("a dry run says nothing of the limit when there is no reading", async () => {
		const out: string[] = [];

		await main(
			[],
			runners,
			(s) => out.push(s),
			() => Promise.resolve(undefined),
		);

		expect(out.join("")).not.toContain("seven-day limit is");
	});

	test("a read that throws leaves the dry run working", async () => {
		const out: string[] = [];

		const code = await main(
			[],
			runners,
			(s) => out.push(s),
			() => Promise.reject(new Error("no store")),
		);

		expect(code).toBe(0);
	});
});
