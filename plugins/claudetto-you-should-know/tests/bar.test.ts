import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import {
	lab,
	OFFER_REPLY,
	openRow,
	step,
	steps,
	TURNED_ON,
	typed,
} from "./lab-kit.ts";

const ON = { options: TURNED_ON };

test(
	"a check runs at every sixth step and at no other",
	ON,
	async ($: Engine, on: On) => {
		const l = lab(on);

		await steps($, l, "t1", { from: 1, to: 5 });
		expect(l.asked).toHaveLength(0);

		await steps($, l, "t1", { from: 6, to: 12 });
		expect(l.asked).toHaveLength(2);
	},
);

test("the first step of a turn never checks", ON, async ($: Engine, on: On) => {
	const l = lab(on);

	await step($, l, { turnId: "t1", index: 0 });

	expect(l.asked).toHaveLength(0);
});

test(
	"a step of a sub-agent is passed through without a check",
	ON,
	async ($: Engine, on: On) => {
		const l = lab(on);

		await step($, l, { turnId: "t1", index: 6, agentId: "a1" });

		expect(l.asked).toHaveLength(0);
	},
);

test(
	"a line that is on the shown list is dropped, whatever its case and final period",
	ON,
	async ($: Engine, on: On) => {
		const l = lab(on, { store: { seen: ["Tests run in order."] } });
		l.reply(OFFER_REPLY("TESTS RUN IN ORDER"));

		await steps($, l, "t1", { from: 1, to: 6 });

		expect(l.asked).toHaveLength(1);
		expect(l.store.get("seen")).toEqual(["Tests run in order."]);
		expect(l.store.get("sessions")).toMatchObject([{ view: null }]);
	},
);

test(
	"a line that is on the known list is dropped, whatever its case and final period",
	ON,
	async ($: Engine, on: On) => {
		const l = lab(on, { store: { known: ["tests run in order"] } });
		l.reply(OFFER_REPLY("Tests run in order."));

		await steps($, l, "t1", { from: 1, to: 6 });

		expect(l.store.get("seen")).toBeUndefined();
		expect(l.store.get("sessions")).toMatchObject([{ view: null }]);
	},
);

test(
	"a new line is shown and joins the shown list",
	ON,
	async ($: Engine, on: On) => {
		const l = lab(on);
		l.reply(OFFER_REPLY("Tests run in order."));

		await steps($, l, "t1", { from: 1, to: 6 });

		expect(l.store.get("seen")).toEqual(["Tests run in order."]);
		expect(l.store.get("sessions")).toMatchObject([
			{ id: "s1", view: { kind: "offer" }, offeredTurn: "t1" },
		]);
	},
);

const ignoreOfferTwice = async ($: Engine, l: ReturnType<typeof lab>) => {
	await typed($, "first");
	await typed($, "second");

	await step($, l, { turnId: "t2", index: 0 });
	await step($, l, { turnId: "t3", index: 0 });
};

test(
	"an ignored offer past the free count leaves a skip that grows",
	ON,
	async ($: Engine, on: On) => {
		const l = lab(on, {
			store: { sessions: [openRow("offer")], typedPastInARow: 2 },
		});
		await ignoreOfferTwice($, l);

		expect(l.store.get("typedPastInARow")).toBe(3);
		expect(l.store.get("looksToSkip")).toBe(1);
	},
);

test(
	"an ignored offer inside the free count leaves no skip",
	ON,
	async ($: Engine, on: On) => {
		const l = lab(on, { store: { sessions: [openRow("offer")] } });
		await ignoreOfferTwice($, l);

		expect(l.store.get("typedPastInARow")).toBe(1);
		expect(l.store.get("looksToSkip")).toBe(0);
	},
);

test(
	"a check that is skipped for the back-off spends one skip and the next one runs",
	ON,
	async ($: Engine, on: On) => {
		const l = lab(on, { store: { looksToSkip: 1 } });

		await step($, l, { turnId: "t1", index: 6 });
		expect(l.asked).toHaveLength(0);
		expect(l.store.get("looksToSkip")).toBe(0);

		await step($, l, { turnId: "t1", index: 12 });
		expect(l.asked).toHaveLength(1);
	},
);

test("no check runs while an offer is open", ON, async ($: Engine, on: On) => {
	const l = lab(on, { store: { sessions: [openRow("offer")] } });

	await steps($, l, "t1", { from: 1, to: 12 });

	expect(l.asked).toHaveLength(0);
});

test(
	"no check runs on a turn that already offered",
	ON,
	async ($: Engine, on: On) => {
		const row = { ...openRow("offer"), view: null, offeredTurn: "t1" };
		const l = lab(on, { store: { sessions: [row] } });

		await step($, l, { turnId: "t1", index: 6 });

		expect(l.asked).toHaveLength(0);
	},
);

test(
	"no check runs when no surface draws the band",
	ON,
	async ($: Engine, on: On) => {
		const l = lab(on, { surfaces: ["vscode"] });

		await steps($, l, "t1", { from: 1, to: 6 });

		expect(l.asked).toHaveLength(0);
	},
);

test(
	"an offer left through two typed prompts is cleared and a shown one survives the first",
	ON,
	async ($: Engine, on: On) => {
		const l = lab(on, { store: { sessions: [openRow("offer")] } });
		await typed($, "first");
		await step($, l, { turnId: "t2", index: 0 });
		expect(l.store.get("sessions")).toMatchObject([
			{ view: { kind: "offer" } },
		]);

		await typed($, "second");
		await step($, l, { turnId: "t3", index: 0 });

		expect(l.store.get("sessions")).toMatchObject([{ view: null }]);
	},
);

test(
	"an open offer is closed when the session ends",
	ON,
	async ($: Engine, on: On) => {
		const l = lab(on, { store: { sessions: [openRow("offer")] } });

		await $.session.end({
			reason: "other",
			sessionId: "s1",
			resume: { id: "s1" },
		});

		expect(l.store.get("sessions")).toMatchObject([{ view: null }]);
	},
);
