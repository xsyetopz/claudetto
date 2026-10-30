import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { lastSevenDay } from "../../claudekit/store.ts";

let home = "";
beforeEach(async () => {
	home = await mkdtemp(path.join(tmpdir(), "store-home-"));
});
afterEach(async () => {
	await rm(home, { recursive: true, force: true });
});

/** Plants a store file of the in-tree plugin holding `json`, stamped `age` seconds ago. */
const plant = async (name: string, json: unknown, age = 0): Promise<void> => {
	const dir = path.join(home, ".claude/plugins/store");
	await mkdir(dir, { recursive: true });
	const file = path.join(dir, name);
	await writeFile(file, JSON.stringify(json));
	const when = new Date(Date.now() - age * 1000);
	await utimes(file, when, when);
};

describe("lastSevenDay", () => {
	test("with no store folder it is undefined", async () => {
		const used = await lastSevenDay(home);

		expect(used).toBeUndefined();
	});

	test("a store whose JSON holds no reading gives undefined", async () => {
		await plant("claudetto_inline-a.json", { "window.rows": [] });

		const used = await lastSevenDay(home);

		expect(used).toBeUndefined();
	});

	test("a reading with a five-hour figure and no seven-day one gives undefined", async () => {
		await plant("claudetto_inline-a.json", {
			"window.last": { fiveHour: 40, usd: 1 },
		});

		const used = await lastSevenDay(home);

		expect(used).toBeUndefined();
	});

	test("a store that is not JSON gives undefined", async () => {
		const dir = path.join(home, ".claude/plugins/store");
		await mkdir(dir, { recursive: true });
		await writeFile(path.join(dir, "claudetto_inline-a.json"), "{");

		const used = await lastSevenDay(home);

		expect(used).toBeUndefined();
	});

	test("the seven-day figure of the newest store is returned, and stores of other plugins are ignored", async () => {
		await plant(
			"claudetto_inline-old.json",
			{ "window.last": { sevenDay: 10, usd: 1 } },
			100,
		);
		await plant("claudetto_inline-new.json", {
			"window.last": { sevenDay: 62.5, usd: 1 },
		});
		await plant("other-zzz.json", { "window.last": { sevenDay: 99, usd: 1 } });

		const used = await lastSevenDay(home);

		expect(used).toBe(62.5);
	});
});
