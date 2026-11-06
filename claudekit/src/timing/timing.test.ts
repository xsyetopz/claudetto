import { describe, expect, test } from "bun:test";
import { firstRequestAt, settled, settledBeforeFirstRequest, timeline } from "./timing.ts";

// Verbatim lines of a recorded settings.read race run, 2.1.318.
const RACE = [
	"2026-11-05T16:22:19.481Z [DEBUG] Reading through symlink: /tmp/x.settings.json",
	"2026-11-05T16:22:19.693Z [DEBUG] hooks module claudetto@inline settings.read settled in 13.7ms (worker hop, next() included)",
	"2026-11-05T16:22:19.737Z [DEBUG] hooks module claudetto@inline settings.read settled in 23.2ms (worker hop, next() included)",
	"2026-11-05T16:22:19.776Z [DEBUG] [API REQUEST] /v1/messages source=sdk",
].join("\n");

const lateSettle = (log: string): string =>
	log.replace("16:22:19.693Z", "16:22:19.800Z").replace("16:22:19.737Z", "16:22:19.801Z");

describe("timeline", () => {
	test("measures from the first line and reads settles and requests", () => {
		const marks = timeline(RACE);
		expect(marks.map((m) => [m.at, m.kind])).toEqual([
			[0, "line"],
			[212, "settled"],
			[256, "settled"],
			[295, "request"],
		]);
		expect(settled(marks, "claudetto@inline", "settings.read").map((m) => m.ms)).toEqual([13.7, 23.2]);
		expect(firstRequestAt(marks)).toBe(295);
	});
});

describe("settledBeforeFirstRequest", () => {
	test("true when the first settle comes before the request, false when after", () => {
		expect(settledBeforeFirstRequest(timeline(RACE), "claudetto@inline", "settings.read")).toBe(true);
		expect(settledBeforeFirstRequest(timeline(lateSettle(RACE)), "claudetto@inline", "settings.read")).toBe(false);
	});

	test("undefined when the module never settled the event", () => {
		expect(settledBeforeFirstRequest(timeline(RACE), "claudetto@inline", "session.start")).toBeUndefined();
	});
});
