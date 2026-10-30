import { describe, expect, test } from "bun:test";
import { LAST_TASK } from "../../fixture/fixture.ts";
import type { Base, Event, Step } from "../../transport/events.ts";
import { measure } from "../measure.ts";

const BASE: Base = {
	cost: 2,
	read: new Set(["/p/notes/part-00.md"]),
	edited: new Set(["/p/src/greet.ts"]),
};
const NONE = { broken: 0, untested: 0, skipped: 0 };

const request = (
	id: string,
	usage: { read: number; write: number },
	tools: [string, string][] = [],
): Event => ({
	type: "assistant",
	message: {
		id,
		usage: {
			input_tokens: 1,
			cache_read_input_tokens: usage.read,
			cache_creation_input_tokens: usage.write,
		},
		content: tools.map(([name, file]) => ({
			type: "tool_use",
			name,
			input: { file_path: file },
		})),
	},
});

const fired = (pre: number, post: number): Event => ({
	type: "system",
	subtype: "compact_boundary",
	compact_metadata: { trigger: "auto", pre_tokens: pre, post_tokens: post },
});

const boundary = fired(176_591, 100_111);

const done = (total: number, turns: number): Event => ({
	type: "result",
	subtype: "success",
	session_id: "s",
	total_cost_usd: total,
	num_turns: turns,
});

const step = (...events: Event[]): Step => ({ code: 0, events });

describe("measure", () => {
	const events = [
		request("m1", { read: 9000, write: 100 }),
		boundary,
		request("m2", { read: 0, write: 8000 }, [
			["Read", "/p/notes/part-00.md"],
			["Edit", "/p/src/greet.ts"],
		]),
		request("m3", { read: 8000, write: 500 }),
		request("m4", { read: 8500, write: 100 }),
		done(5, 14),
	];

	test("takes cost as the total less the cost of the base", () => {
		const r = measure("alt", 30_000, 2, [step(...events)], BASE, NONE, "");

		expect(r.cost).toBe(3);
		expect(r.arm).toBe("alt");
		expect(r.run).toBe(2);
	});

	test("takes turns to completion from the result of the step", () => {
		const r = measure("ref", 30_000, 1, [step(...events)], BASE, NONE, "");

		expect(r.turns).toBe(14);
	});

	test("counts the compactions that the step ran", () => {
		const twice = [...events.slice(0, -1), boundary, events.at(-1) ?? {}];

		const r = measure("ref", 30_000, 1, [step(...twice)], BASE, NONE, "");

		expect(r.compactions).toBe(2);
	});

	test("takes the peak context as the largest input side of a request", () => {
		const r = measure("ref", 30_000, 1, [step(...events)], BASE, NONE, "");

		expect(r.peak).toBe(9101);
	});

	test("takes the peak over every step of the fork, not the last one only", () => {
		const small = step(request("m9", { read: 10, write: 10 }), done(6, 2));

		const r = measure(
			"ref",
			30_000,
			1,
			[step(...events), small],
			BASE,
			NONE,
			"",
		);

		expect(r.peak).toBe(9101);
	});

	test("takes the compaction point from the boundary and not from the billed requests", () => {
		const r = measure("ref", 30_000, 1, [step(...events)], BASE, NONE, "");

		expect(r.firstPre).toBe(176_591);
		expect(r.firstPost).toBe(100_111);
		expect(r.peak).toBeLessThan(10_000);
	});

	test("takes the first compaction when the fork compacted more than once", () => {
		const twice = [
			request("m1", { read: 9000, write: 100 }),
			fired(140_300, 90_000),
			request("m2", { read: 1, write: 1 }),
			fired(201_769, 4692),
			done(5, 20),
		];

		const r = measure("ref", 30_000, 1, [step(...twice)], BASE, NONE, "");

		expect(r.firstPre).toBe(140_300);
		expect(r.compactions).toBe(2);
	});

	test("leaves the compaction point unknown for a fork that did not compact", () => {
		const still = [request("m1", { read: 9000, write: 100 }), done(5, 3)];

		const r = measure("ref", 30_000, 1, [step(...still)], BASE, NONE, "");

		expect(r.firstPre).toBeNaN();
		expect(r.firstPost).toBeNaN();
	});

	test("reads the cache write of the first request after the compaction", () => {
		const r = measure("ref", 30_000, 1, [step(...events)], BASE, NONE, "");

		expect(r.firstWrite).toBe(8000);
	});

	test("reads the cache share of the two requests that follow it", () => {
		const r = measure("ref", 30_000, 1, [step(...events)], BASE, NONE, "");

		expect(r.shares[0]).toBeCloseTo(8000 / 8501, 6);
		expect(r.shares[1]).toBeCloseTo(8500 / 8601, 6);
	});

	test("counts a second read of a file the fork itself read first", () => {
		const twice = [
			request("m1", { read: 1, write: 1 }, [["Read", "/p/later/part-00.md"]]),
			request("m2", { read: 1, write: 1 }, [["Read", "/p/later/part-00.md"]]),
			done(5, 3),
		];

		const r = measure("ref", 30_000, 1, [step(...twice)], BASE, NONE, "");

		expect(r.rereads).toBe(1);
	});

	test("counts a first read of a file no one read before as no reread", () => {
		const once = [
			request("m1", { read: 1, write: 1 }, [["Read", "/p/later/part-00.md"]]),
			done(5, 3),
		];

		const r = measure("ref", 30_000, 1, [step(...once)], BASE, NONE, "");

		expect(r.rereads).toBe(0);
	});

	test("counts reads of files already read and edits of files already changed", () => {
		const r = measure("ref", 30_000, 1, [step(...events)], BASE, NONE, "");

		expect(r.rereads).toBe(1);
		expect(r.redone).toBe(1);
	});

	test("does not count a write to a file that is not a source of the base tasks", () => {
		const base: Base = { ...BASE, edited: new Set(["/p/notes/x.md"]) };
		const other = [
			request("m1", { read: 1, write: 1 }, [["Edit", "/p/notes/x.md"]]),
			done(5, 3),
		];

		const r = measure("ref", 30_000, 1, [step(...other)], base, NONE, "");

		expect(r.redone).toBe(0);
	});

	test("scores the next task done when the last task is ticked", () => {
		const ticked = measure(
			"ref",
			30_000,
			1,
			[step(...events)],
			BASE,
			NONE,
			`- [x] ${LAST_TASK} a`,
		);
		const open = measure(
			"ref",
			30_000,
			1,
			[step(...events)],
			BASE,
			NONE,
			`- [ ] ${LAST_TASK} a`,
		);

		expect(ticked.next).toBe(1);
		expect(open.next).toBe(0);
	});

	test("marks a fork with no step invalid", () => {
		const r = measure("ref", 30_000, 1, [], BASE, NONE, "");

		expect(r.invalid).not.toBeNull();
	});

	test("marks a fork whose total fell below the base invalid", () => {
		const low = [request("m1", { read: 1, write: 1 }), done(1, 2)];

		const r = measure("ref", 30_000, 1, [step(...low)], BASE, NONE, "");

		expect(r.invalid).not.toBeNull();
	});
});
