import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { LIMITS } from "./note";
import {
	act,
	type Fixture,
	fixture,
	LINE,
	mountBand,
	offerReply,
	ON,
	openRow,
	PUSH,
	step,
} from "./register.mock";
import { linesOf, rowsOf } from "./store";

for (const [name, text] of [
	["a reply that fails parsing", "no label here"],
	["a reply with an empty line", "learn:"],
	["a reply of none", "learn: none"],
] as const) {
	test(
		`${name} shows nothing and stores no shown line`,
		ON,
		async ($: Engine, on: On) => {
			const f = fixture(on);
			f.answerWith(text);
			await act($, f, "t1");
			expect(f.asked).toHaveLength(1);
			expect(f.store.get("shown")).toBeUndefined();
			expect(f.row()?.view).toBeNull();
		},
	);
}

test(
	"a new line is shown and joins the shown list",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on);
		f.answerWith(offerReply(LINE));
		await act($, f, "t1");
		expect(f.store.get("shown")).toEqual([LINE]);
		expect(f.row()).toMatchObject({
			view: { kind: "offer" },
			offeredTurn: "t1",
		});
	},
);

test(
	"a line equal to a shown line except for case and final period shows nothing",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, { store: { shown: [LINE] } });
		f.answerWith(offerReply("TESTS RUN IN ORDER"));
		await act($, f, "t1");
		expect(f.asked).toHaveLength(1);
		expect(f.store.get("shown")).toEqual([LINE]);
		expect(f.row()?.view).toBeNull();
	},
);

test(
	"a line equal to a known line except for case and final period shows nothing",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, { store: { known: ["tests run in order"] } });
		f.answerWith(offerReply(LINE));
		await act($, f, "t1");
		expect(f.store.get("shown")).toBeUndefined();
		expect(f.row()?.view).toBeNull();
	},
);

const outcomeOf = (f: Fixture) => ({
	requests: f.asked.length,
	view: f.row()?.view ?? null,
	shown: f.store.get("shown"),
});

const NOTHING_SHOWN = { requests: 1, view: null, shown: undefined };

const lateReply = async (
	$: Engine,
	on: On,
	change: (f: Fixture) => unknown,
) => {
	const f = fixture(on);
	f.answerWith(offerReply(LINE));
	const release = f.hold();
	await step($, f, { turnId: "t1", index: 1 });
	const call = $.tool.call(PUSH);
	await f.clock.settle();
	await change(f);
	release();
	await call;
	return f;
};

test(
	"a reply that arrives after its turn changed shows nothing",
	ON,
	async ($: Engine, on: On) => {
		const f = await lateReply($, on, (m) =>
			m.store.set("sessions", [{ ...m.row(), askedTurn: "t2" }]),
		);
		expect(outcomeOf(f)).toEqual(NOTHING_SHOWN);
	},
);

test(
	"a reply that arrives after its session ended shows nothing",
	ON,
	async ($: Engine, on: On) => {
		const f = await lateReply($, on, () =>
			$.session.end({ reason: "other", sessionId: "s1", resume: { id: "s1" } }),
		);
		expect(outcomeOf(f)).toEqual(NOTHING_SHOWN);
	},
);

test(
	"a reply that arrives while a view is open leaves that view as it is",
	ON,
	async ($: Engine, on: On) => {
		const f = await lateReply($, on, (m) =>
			m.store.set("sessions", [{ ...openRow("asked"), askedTurn: "t1" }]),
		);
		expect(f.row()?.view?.kind).toBe("asked");
		expect(f.store.get("shown")).toBeUndefined();
	},
);

test(
	"a 33rd session row evicts a closed row first",
	ON,
	async ($: Engine, on: On) => {
		const rows = Array.from({ length: 32 }, (_, n) => ({
			...openRow("offer"),
			id: `r${n}`,
		})).with(7, { ...openRow("offer"), id: "r7", view: null });
		const f = fixture(on, { store: { sessions: rows } });
		await act($, f, "t1");
		const ids = rowsOf(f.store.get("sessions")).map((r) => r.id);
		expect(ids).toHaveLength(LIMITS.sessionsMax);
		expect(ids).toContain("s1");
		expect(ids).not.toContain("r7");
	},
);

test(
	"the shown list keeps its last 50 lines",
	ON,
	async ($: Engine, on: On) => {
		const shown = Array.from({ length: 50 }, (_, n) => `Line ${n}.`);
		const f = fixture(on, { store: { shown } });
		f.answerWith(offerReply("A new line."));
		await act($, f, "t1");
		const kept = linesOf(f.store.get("shown"));
		expect(kept).toHaveLength(50);
		expect(kept.at(-1)).toBe("A new line.");
	},
);

test(
	"the known list keeps its last 50 lines",
	ON,
	async ($: Engine, on: On) => {
		const known = Array.from({ length: 50 }, (_, n) => `Line ${n}.`);
		const f = fixture(on, { store: { sessions: [openRow("offer")], known } });
		const band = await mountBand($);
		await band.press({ key: "know" });
		const kept = linesOf(f.store.get("known"));
		expect(kept).toHaveLength(50);
		expect(kept.at(-1)).toBe(LINE);
	},
);
