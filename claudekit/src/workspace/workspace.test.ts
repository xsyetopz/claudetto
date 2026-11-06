import { describe, expect, test } from "bun:test";
import { utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_MODEL } from "../shared/model.ts";
import { tempDir } from "../shared/temp.ts";
import {
	clean,
	createRun,
	listRuns,
	newRunId,
	planClean,
	readRecord,
	writeRecord,
} from "./workspace.ts";

const RUN_ID = /^\d{8}-\d{6}-[0-9a-f]{6}$/;
const BAD_NAME = /bad probe name/;
const OUTSIDE = /outside/;

const root = (): Promise<string> => tempDir("ws");

describe("workspace", () => {
	test("run ids are dated and unique", () => {
		const ids = new Set(Array.from({ length: 50 }, () => newRunId()));
		expect(ids.size).toBe(50);
		for (const id of ids) {
			expect(id).toMatch(RUN_ID);
		}
	});

	test("defaults under $TMPDIR, never a fixed /tmp path", async () => {
		const run = await createRun({ probe: "unit", quiet: true });
		expect(
			run.dir.startsWith(
				join(process.env.TMPDIR ?? tmpdir(), "claudekit", "unit"),
			),
		).toBe(true);
	});

	test("refuses a probe name that is not a plain folder name", async () => {
		await expect(
			createRun({ probe: "../escape", root: await root(), quiet: true }),
		).rejects.toThrow(BAD_NAME);
	});

	test("round-trips a record and lists runs", async () => {
		const r = await root();
		const run = await createRun({ probe: "p", root: r, quiet: true });
		await createRun({ probe: "p", root: r, quiet: true });
		const record = {
			probe: "p",
			runId: run.id,
			argv: ["claude", "-p"],
			envNames: ["HOME"],
			claudeVersion: "2.1.318",
			pluginTreeHashes: {},
			model: DEFAULT_MODEL,
			settings: {},
			startedAt: "2026-11-05T00:00:00Z",
		};
		await writeRecord(run, record);
		expect(await readRecord(run.dir)).toEqual(record);
		const runs = await listRuns({ root: r });
		expect(runs).toHaveLength(2);
		expect(runs.filter((x) => x.record).map((x) => x.id)).toEqual([run.id]);
	});

	test("planClean names only old runs, and clean refuses paths outside the root", async () => {
		const r = await root();
		const old = await createRun({ probe: "p", root: r, quiet: true });
		const fresh = await createRun({ probe: "p", root: r, quiet: true });
		const tenDaysAgo = (Date.now() - 10 * 86_400_000) / 1000;
		await utimes(old.dir, tenDaysAgo, tenDaysAgo);
		const plan = await planClean({ probe: "p", olderThanDays: 7, root: r });
		expect(plan).toEqual([old.dir]);
		await expect(clean(["/etc"], r)).rejects.toThrow(OUTSIDE);
		await clean(plan, r);
		expect((await listRuns({ root: r })).map((x) => x.dir)).toEqual([
			fresh.dir,
		]);
	});
});
