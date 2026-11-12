import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { LIMITS } from "./note";
import {
	act,
	fixture,
	inOrder,
	mountBand,
	ON,
	openRow,
	pressed,
	step,
	typed,
} from "./register.mock";

test(
	"five ignored offers in a row leave four check chances without a request",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, {
			store: { sessions: [openRow("offer")], ignored: 4 },
		});
		await typed($, "first");
		await typed($, "second");
		await step($, f, { turnId: "t2", index: 0 });
		expect(f.store.get("ignored")).toBe(5);
		expect(f.store.get("skips")).toBe(4);
		await inOrder([1, 2, 3, 4], () => act($, f, "t3"));
		expect(f.asked).toHaveLength(0);
		await act($, f, "t3");
		expect(f.asked).toHaveLength(1);
	},
);

test("the skips stop growing at 16", ON, async ($: Engine, on: On) => {
	const f = fixture(on, {
		store: { sessions: [openRow("offer")], ignored: 20 },
	});
	await typed($, "first");
	await typed($, "second");
	await step($, f, { turnId: "t2", index: 0 });
	expect(f.store.get("skips")).toBe(16);
});

test(
	"an offer ignored inside the free count leaves no skip",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, { store: { sessions: [openRow("offer")] } });
		await typed($, "first");
		await typed($, "second");
		await step($, f, { turnId: "t2", index: 0 });
		expect(f.store.get("ignored")).toBe(1);
		expect(f.store.get("skips")).toBe(0);
	},
);

test(
	"an offer survives the first prompt typed past it and is cleared by the second",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, { store: { sessions: [openRow("offer")] } });
		await typed($, "first");
		await step($, f, { turnId: "t2", index: 0 });
		expect(f.row()?.view?.kind).toBe("offer");
		await typed($, "second");
		await step($, f, { turnId: "t3", index: 0 });
		expect(f.row()?.view).toBeNull();
	},
);

test(
	"two prompts typed through the bridge clear the offer",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, { store: { sessions: [openRow("offer")] } });
		await typed($, "first", { kind: "bridge" });
		await typed($, "second", { kind: "bridge" });
		await step($, f, { turnId: "t2", index: 0 });
		expect(f.row()?.view).toBeNull();
	},
);

test(
	"prompts a plugin sends do not count as typed past an offer",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, { store: { sessions: [openRow("offer")] } });
		await typed($, "first", { kind: "plugin", name: "other" });
		await typed($, "second", { kind: "plugin", name: "other" });
		await step($, f, { turnId: "t2", index: 0 });
		expect(f.row()?.view?.kind).toBe("offer");
	},
);

test(
	"a skipped check chance spends one skip and the next chance runs",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, { store: { skips: 1 } });
		await act($, f, "t1");
		expect(f.asked).toHaveLength(0);
		expect(f.store.get("skips")).toBe(0);
		await act($, f, "t1");
		expect(f.asked).toHaveLength(1);
	},
);

test(
	"the asked view closing itself after 20 seconds leaves the count at three",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, { store: { sessions: [openRow("offer")] } });
		const band = await mountBand($);
		await band.press({ key: "dismiss" });
		expect(f.row()?.view?.kind).toBe("asked");
		f.store.set("ignored", 3);
		f.store.set("skips", 1);
		await f.clock.advance(LIMITS.askedMs);
		expect(f.row()?.view).toBeNull();
		expect(f.store.get("ignored")).toBe(3);
		expect(f.store.get("skips")).toBe(1);
	},
);

test(
	"Dismiss on the asked view closes it and keeps the counts",
	ON,
	async ($: Engine, on: On) => {
		const f = await pressed($, on, "asked", "dismiss");
		expect(f.row()?.view).toBeNull();
		expect(f.store.get("ignored")).toBe(4);
		expect(f.store.get("skips")).toBe(8);
	},
);

test(
	"dismissing an offer opens the asked view and resets the counts",
	ON,
	async ($: Engine, on: On) => {
		const f = await pressed($, on, "offer", "dismiss");
		expect(f.row()?.view?.kind).toBe("asked");
		expect(f.store.get("ignored")).toBe(0);
		expect(f.store.get("skips")).toBe(0);
	},
);

test(
	"an open offer is closed when its session ends",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, { store: { sessions: [openRow("offer")] } });
		await $.session.end({
			reason: "other",
			sessionId: "s1",
			resume: { id: "s1" },
		});
		expect(f.row()?.view).toBeNull();
	},
);
