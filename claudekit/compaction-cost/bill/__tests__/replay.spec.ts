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
