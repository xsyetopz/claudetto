import { beforeAll, describe, expect, test } from "bun:test";
import { writeFixture } from "../../__tests__/fixture.ts";
import { loadSessions, type Session } from "../../transcripts/transcripts.ts";
import { measureKept } from "../fit.ts";
import { replay, tracksOf } from "../replay.ts";

describe("the replay on the two-session fixture", () => {
	let sessions: Session[] = [];

	beforeAll(async () => {
		sessions = await loadSessions(await writeFixture());
	});

	test("tracksOf drops the growth across each boundary", () => {
		// Session one: 100k to 150k to 200k grows 50k, 50k. The boundary resets.
		// 30k to 50k grows 20k. Session two: 50k to 100k grows 50k, then the reset.
		expect(tracksOf(sessions)).toEqual([
			{ first: 100_000, growths: [50_000, 50_000, 20_000] },
			{ first: 50_000, growths: [50_000] },
		]);
	});

	test("measureKept averages the fixed block and the summary over 2 boundaries", () => {
		// Summaries: 40,000 / 4 = 10,000 and 20,000 / 4 = 5,000 tokens, mean 7,500.
		// Fixed: (20,000 - 10,000 + 17,000 - 5,000) / 2 = 11,000.
		// Share: (10,000 / 200,000 + 5,000 / 100,000) / 2 = 0.05.
		const kept = measureKept(sessions, "proportional");

		expect(kept.rows).toBe(2);
		expect(kept.fixed).toBeCloseTo(11_000, 6);
		expect(kept.share).toBeCloseTo(0.05, 9);
		expect(kept.summary).toBeCloseTo(7500, 6);
		expect(kept.mode).toBe("proportional");
	});

	test("a threshold of 120,000 compacts twice, billed $0.35296", () => {
		// Kept at 100,000 is min(100,000, 11,000 + 5,000) = 16,000, so the summary is 5,000.
		// Session one: 100k, 150k > 120k compacts (read 0.02, summary 0.1), size 16k + 50k = 66k;
		// 116k stays; 136k > 120k compacts (read 0.0232, kept 16,800, summary 5,800 = 0.116);
		// size 16.8k + 20k = 36.8k. Session two: 50k, 100k, no compaction.
		// Sizes 100,000 66,000 116,000 36,800 50,000 100,000 sum 468,800: reads 0.09376.
		// Compacting 0.02 + 0.1 + 0.0232 + 0.116 = 0.2592.
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
		// Sizes 100k 150k 200k 220k and 50k 100k sum 820,000 at $0.2 per million.
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
