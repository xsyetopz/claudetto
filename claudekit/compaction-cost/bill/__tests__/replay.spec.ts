import { beforeAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { write } from "bun";
import {
	assistant,
	boundary,
	summary,
	writeFixture,
} from "../../__tests__/fixture.ts";
import { OPUS } from "../../price.ts";
import { loadSessions, type Session } from "../../transcripts/transcripts.ts";
import { measureKept, summaryOf } from "../fit.ts";
import { replay, tracksOf } from "../replay.ts";

describe("the replay on the two-session fixture", () => {
	let sessions: Session[] = [];

	beforeAll(async () => {
		sessions = await loadSessions(await writeFixture());
	});

	test("tracksOf drops the growth across each boundary", () => {
		expect(tracksOf(sessions)).toEqual([
			{ first: 100_000, growths: [50_000, 50_000, 20_000] },
			{ first: 50_000, growths: [50_000] },
		]);
	});

	test("measureKept averages the fixed block and the summary over 2 boundaries", () => {
		const kept = measureKept(sessions, "proportional");

		expect(kept.rows).toBe(2);
		expect(kept.fixed).toBeCloseTo(11_000, 6);
		expect(kept.share).toBeCloseTo(0.05, 9);
		expect(kept.summary).toBeCloseTo(7500, 6);
		expect(kept.mode).toBe("proportional");
	});

	test("a threshold of 120,000 compacts twice, billed $0.35296", () => {
		const tracks = tracksOf(sessions);
		const kept = measureKept(sessions, "proportional");

		const row = replay(tracks, 120_000, { writes: 0, out: 0, kept });

		expect(row.compactions).toBe(2);
		expect(row.reads).toBeCloseTo(0.093_76, 9);
		expect(row.compacting).toBeCloseTo(0.2592, 9);
		expect(row.billed).toBeCloseTo(0.352_96, 9);
		expect(row.meanPrompt).toBeCloseTo(468_800 / 6, 6);
	});

	test("a threshold of 300,000 never compacts, billed $0.164 of reads", () => {
		const tracks = tracksOf(sessions);
		const kept = measureKept(sessions, "proportional");

		const row = replay(tracks, 300_000, { writes: 0, out: 0, kept });

		expect(row.compactions).toBe(0);
		expect(row.compacting).toBe(0);
		expect(row.billed).toBeCloseTo(0.164, 9);
	});

	test("the fixed writes and output are added to the bill unchanged", () => {
		const tracks = tracksOf(sessions);
		const kept = measureKept(sessions, "proportional");

		const row = replay(tracks, 300_000, { writes: 1, out: 2, kept });

		expect(row.billed).toBeCloseTo(3.164, 9);
	});
});

describe("the post-compaction cache write", () => {
	const written = async (): Promise<Session[]> => {
		const root = await mkdtemp(path.join(os.tmpdir(), "compaction-write-"));
		await mkdir(path.join(root, "proj"), { recursive: true });
		const lines = [
			assistant(100_000),
			assistant(200_000),
			boundary(200_000, 20_000, "auto"),
			summary(40_000),
			assistant(0, [], 25_000),
			assistant(25_000),
		];
		await write(path.join(root, "proj", "s.jsonl"), `${lines.join("\n")}\n`);
		return loadSessions(root);
	};

	test("measureKept takes the first request after a boundary as the write", async () => {
		const kept = measureKept(await written(), "proportional");

		expect(kept.write).toBe(25_000);
		expect(kept.written).toBe(25_000);
	});

	test("each replayed compaction pays the write at the cache write rate", async () => {
		const sessions = await written();
		const kept = measureKept(sessions, "proportional");
		const tracks = [{ first: 100_000, growths: [100_000] }];

		const none = replay(tracks, 300_000, { writes: 0, out: 0, kept });
		const row = replay(tracks, 120_000, { writes: 0, out: 0, kept });

		expect(row.compactions).toBe(1);
		const rewrite = 25_000 * (OPUS.write / 1_000_000);
		const reread = 100_000 * (OPUS.read / 1_000_000);
		const summarized = summaryOf(kept, 100_000) * (OPUS.out / 1_000_000);
		expect(row.compacting).toBeCloseTo(reread + summarized + rewrite, 9);
		expect(none.compacting).toBe(0);
	});
});

describe("a boundary whose pre-compaction size is below its post-compaction size", () => {
	test("measureKept leaves it out, because a compaction cannot grow the context", async () => {
		const root = await mkdtemp(path.join(os.tmpdir(), "compaction-bogus-"));
		await mkdir(path.join(root, "proj"), { recursive: true });
		const lines = [
			assistant(100_000),
			boundary(200_000, 20_000, "auto"),
			summary(40_000),
			assistant(30_000),
			boundary(2, 9000, "manual"),
			summary(1000),
			assistant(30_000),
		];
		await write(path.join(root, "proj", "s.jsonl"), `${lines.join("\n")}\n`);

		const kept = measureKept(await loadSessions(root), "proportional");

		expect(kept.rows).toBe(1);
		expect(kept.share).toBeCloseTo(0.05, 9);
	});
});
