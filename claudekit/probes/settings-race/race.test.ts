import { describe, expect, test } from "bun:test";
import { checkGrader } from "../../src/grade/grade.ts";
import { arms, measures, session } from "./probe.ts";
import { keptOut, measure } from "./race.ts";

// Lines from a recorded seq run (/tmp/probe-fsx/fr-seq-1.debug:128,137): the request went out before the hook settled.
const LATE = [
	"2026-11-05T16:20:00.440Z [DEBUG] hooks module claudetto@inline loaded (worker, environment 1, tier user); events: settings.read",
	"2026-11-05T16:20:00.518Z [DEBUG] [API REQUEST] /v1/messages source=sdk",
	"2026-11-05T16:20:00.532Z [DEBUG] hooks module claudetto@inline settings.read settled in 85.1ms (worker hop, next() included)",
].join("\n");

describe("keptOut", () => {
	test("passes its good fixtures and fails its bad one", async () => {
		expect(await checkGrader(keptOut)).toMatchObject({ ok: true });
	});
});

describe("measure", () => {
	test("reads a late settle, and leaves the order unknown when the settle is missing", () => {
		expect(measure(LATE, {}, "claudetto@inline")).toEqual({ settledMs: 85.1, settledFirst: false, listed: false });
		expect(measure(LATE, {}, "race@inline")).toEqual({ settledMs: undefined, settledFirst: undefined, listed: false });
	});
});

describe("session", () => {
	test("a fast hook loads as asserted, settles before the first request, and keeps simplify out", async () => {
		const none = arms.find((a) => a.name === "none");
		if (!none) {
			throw new Error("no none arm");
		}
		const r = await session({ arm: none, case: { name: "hi", prompt: "hi" }, index: 0 });
		expect(r.armCheck).toMatchObject({ ok: true, diff: [] });
		expect(r.verdict.label).toBe("kept out");
		expect(measures.get(r.runId)?.settledFirst).toBe(true);
	});
});
