import { describe, expect, test } from "bun:test";
import { emptyHits, formatHit, measureHits } from "../hit.ts";
import { assistant, boundary, makeRoot, writeTranscript } from "./fixture.ts";

const OPEN = {
	since: Date.parse("2026-10-27"),
	until: Number.POSITIVE_INFINITY,
};

describe("measureHits", () => {
	test("buckets each request by the share of its prompt read from cache", async () => {
		const root = await makeRoot();
		await writeTranscript(root, "p/s1.jsonl", [
			assistant({ id: "a", at: "2026-10-28T01:00:00Z", write: 5000 }),
			assistant({
				id: "b",
				at: "2026-10-28T01:01:00Z",
				read: 4900,
				write: 100,
			}),
			assistant({
				id: "c",
				at: "2026-10-28T01:02:00Z",
				read: 3000,
				write: 2000,
			}),
			assistant({
				id: "d",
				at: "2026-10-28T01:03:00Z",
				read: 100,
				write: 4900,
			}),
		]);

		const hits = await measureHits(root, OPEN);

		expect(hits).toMatchObject({ n: 4, hit95: 1, hit50: 1, miss: 2 });
		expect(hits.missWrite).toBe(9900);
		expect(hits.allWrite).toBe(12_000);
	});

	test("leaves out small requests, sidechain requests, and the first request after a compaction", async () => {
		const root = await makeRoot();
		await writeTranscript(root, "p/s1.jsonl", [
			assistant({ id: "a", at: "2026-10-28T01:00:00Z", read: 10 }),
			assistant({
				id: "b",
				at: "2026-10-28T01:01:00Z",
				read: 5000,
				sidechain: true,
			}),
			boundary(),
			assistant({ id: "c", at: "2026-10-28T01:02:00Z", write: 5000 }),
			assistant({ id: "d", at: "2026-10-28T01:03:00Z", read: 5000 }),
		]);

		expect(await measureHits(root, OPEN)).toMatchObject({
			n: 1,
			hit95: 1,
			miss: 0,
		});
	});

	test("measures the gap before a miss and counts a first request apart", async () => {
		const root = await makeRoot();
		await writeTranscript(root, "p/s1.jsonl", [
			assistant({ id: "a", at: "2026-10-28T01:00:00Z", write: 5000 }),
			assistant({ id: "b", at: "2026-10-28T01:03:00Z", write: 5000 }),
			assistant({ id: "c", at: "2026-10-28T03:03:00Z", write: 5000 }),
		]);

		const hits = await measureHits(root, OPEN);

		expect(hits).toMatchObject({
			miss: 3,
			missesWithoutPrevious: 1,
			missesAfterGap5m: 1,
			missesAfterGap60m: 1,
		});
		expect(hits.gapsMinutes).toEqual([3, 120]);
	});
});

describe("the gaps between 5 and 60 minutes", () => {
	test("counts the requests that follow such a gap, with the hits and misses among them", async () => {
		const root = await makeRoot();
		await writeTranscript(root, "p/s1.jsonl", [
			assistant({ id: "a", at: "2026-10-28T01:00:00Z", write: 5000 }),
			// 3 min: under the limit. 10 min and 60 min: inside, one hit and one miss.
			assistant({ id: "b", at: "2026-10-28T01:03:00Z", read: 5000 }),
			assistant({ id: "c", at: "2026-10-28T01:13:00Z", read: 5000 }),
			assistant({ id: "d", at: "2026-10-28T02:13:00Z", write: 5000 }),
			// 61 min: over the limit.
			assistant({ id: "e", at: "2026-10-28T03:14:00Z", write: 5000 }),
			// Exactly 5 min: not over it.
			assistant({ id: "f", at: "2026-10-28T03:19:00Z", read: 5000 }),
		]);

		expect(await measureHits(root, OPEN)).toMatchObject({
			midGaps: 2,
			midGapHits: 1,
			midGapMisses: 1,
		});
	});

	test("prints the counts", () => {
		const text = formatHit({
			...emptyHits(),
			midGaps: 5,
			midGapHits: 3,
			midGapMisses: 2,
		});

		expect(text).toContain(
			"requests after a gap of more than 5 and up to 60 min 5, hits 3, misses 2",
		);
	});
});

describe("formatHit", () => {
	test("prints counts, the miss share of writes, and the median gap", async () => {
		const text = formatHit({
			n: 4,
			hit95: 1,
			hit50: 1,
			miss: 2,
			missWrite: 9900,
			allWrite: 12_000,
			missesWithoutPrevious: 0,
			missesAfterGap5m: 1,
			missesAfterGap60m: 1,
			midGaps: 0,
			midGapHits: 0,
			midGapMisses: 0,
			gapsMinutes: [3, 120],
		});

		expect(text).toContain("requests 4");
		expect(text).toContain("misses 2");
		expect(text).toContain("miss share of cache writes 0.825");
		expect(text).toContain("median gap before a miss 120.0 min");
	});
});
