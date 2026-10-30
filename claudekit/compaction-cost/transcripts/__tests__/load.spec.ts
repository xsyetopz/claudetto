import { beforeAll, describe, expect, test } from "bun:test";
import { MARKER, writeFixture } from "../../__tests__/fixture.ts";
import {
	boundariesOf,
	loadSessions,
	requestsOf,
	type Session,
	sizeOf,
} from "../transcripts.ts";

describe("loadSessions on the two-session fixture", () => {
	let sessions: Session[] = [];

	beforeAll(async () => {
		sessions = await loadSessions(await writeFixture());
	});

	test("keeps the two sessions with a compaction and drops the plain one", () => {
		expect(sessions.length).toBe(2);
	});

	test("requestsOf finds 5 + 3 = 8 requests, in path order", () => {
		const sizes = requestsOf(sessions).map(sizeOf);

		expect(sizes).toEqual([
			100_000, 150_000, 200_000, 30_000, 50_000, 50_000, 100_000, 25_000,
		]);
	});

	test("requestsOf keeps the tool names and the read path", () => {
		const first = requestsOf(sessions)[0];

		expect(first?.tools).toEqual(["Read"]);
		expect(first?.paths).toEqual(["/a.ts"]);
		expect(first?.out).toBe(1000);
	});

	test("boundariesOf finds one auto and one manual boundary", () => {
		const found = boundariesOf(sessions);

		expect(found).toEqual([
			{
				kind: "boundary",
				trigger: "auto",
				pre: 200_000,
				post: 20_000,
				ms: 60_000,
			},
			{
				kind: "boundary",
				trigger: "manual",
				pre: 100_000,
				post: 17_000,
				ms: 30_000,
			},
		]);
	});

	test("the summary records carry only their length, 40,000 and 20,000 characters", () => {
		const chars = sessions
			.flat()
			.flatMap((item) => (item.kind === "summary" ? [item.chars] : []));

		expect(chars).toEqual([40_000, 20_000]);
	});

	test("no loaded item holds any message text", () => {
		const dump = JSON.stringify(sessions);

		expect(dump).not.toContain(MARKER);
	});
});
