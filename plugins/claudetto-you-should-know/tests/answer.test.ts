import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { BORROWED } from "../src/constants.ts";
import { BAND, lab, openRow, TURNED_ON } from "./lab-kit.ts";

const ON = { options: TURNED_ON };

const PLUGIN = "claudetto-you-should-know";

const backedOff = {
	typedPastInARow: 4,
	looksToSkip: 8,
};

const mountBand = ($: Engine) =>
	$.ui.mount({
		plugin: PLUGIN,
		surface: "terminal",
		component: "AbovePrompt",
		props: BAND,
	});

const pressOn = async (
	$: Engine,
	on: On,
	row: "offer" | "asked",
	key: string,
) => {
	const l = lab(on, { store: { sessions: [openRow(row)], ...backedOff } });
	const band = await mountBand($);
	await band.press({ key });
	return l;
};

test(
	"knowing a line already adds it to the known list, closes the offer, and resets both counters",
	ON,
	async ($: Engine, on: On) => {
		const l = await pressOn($, on, "offer", "know");

		expect(l.store.get("known")).toEqual(["Tests run in order."]);
		expect(l.store.get("sessions")).toMatchObject([{ view: null }]);
		expect(l.store.get("typedPastInARow")).toBe(0);
		expect(l.store.get("looksToSkip")).toBe(0);
	},
);

test(
	"dismissing an offer is an answer, so it resets both counters and opens the asked row",
	ON,
	async ($: Engine, on: On) => {
		const l = await pressOn($, on, "offer", "dismiss");

		expect(l.store.get("typedPastInARow")).toBe(0);
		expect(l.store.get("looksToSkip")).toBe(0);
		expect(l.store.get("sessions")).toMatchObject([
			{ view: { kind: "asked" } },
		]);
	},
);

test(
	"an asked row that times out closes without resetting the counters",
	ON,
	async ($: Engine, on: On) => {
		const l = lab(on, { store: { sessions: [openRow("offer")] } });
		const band = await mountBand($);
		await band.press({ key: "dismiss" });
		l.store.set("typedPastInARow", backedOff.typedPastInARow);
		l.store.set("looksToSkip", backedOff.looksToSkip);

		await l.clock.advance(BORROWED.ASKED_MS);

		expect(l.store.get("sessions")).toMatchObject([{ view: null }]);
		expect(l.store.get("typedPastInARow")).toBe(backedOff.typedPastInARow);
		expect(l.store.get("looksToSkip")).toBe(backedOff.looksToSkip);
	},
);

test(
	"the dismiss key of the asked row ends the offer as a timeout does, with the counters kept",
	ON,
	async ($: Engine, on: On) => {
		const l = await pressOn($, on, "asked", "dismiss");

		expect(l.store.get("sessions")).toMatchObject([{ view: null }]);
		expect(l.store.get("typedPastInARow")).toBe(backedOff.typedPastInARow);
	},
);

test(
	"a helpful answer on the asked row adds the line to the known list and resets the counters",
	ON,
	async ($: Engine, on: On) => {
		const l = await pressOn($, on, "asked", "helpful");

		expect(l.store.get("known")).toEqual(["Tests run in order."]);
		expect(l.store.get("looksToSkip")).toBe(0);
	},
);

test(
	"an offer with an explanation opens it at once with no second request",
	ON,
	async ($: Engine, on: On) => {
		const open = openRow("offer");
		const withExplanation = {
			...open,
			view: {
				...open.view,
				explanation: `**Order**
Tests run top to bottom.`,
			},
		};
		const l = lab(on, { store: { sessions: [withExplanation] } });
		const band = await mountBand($);

		await band.press({ key: "learn" });

		expect(l.asked).toHaveLength(0);
		expect(l.store.get("sessions")).toMatchObject([
			{ view: { kind: "explained" } },
		]);
	},
);

test(
	"an offer with no explanation draws no key to ask for more",
	ON,
	async ($: Engine, on: On) => {
		lab(on, { store: { sessions: [openRow("offer")] } });
		const band = await mountBand($);

		const learn = await band.find({ type: "Button", key: "learn" });

		expect(learn).toBeUndefined();
		expect(await band.find({ type: "Button", key: "know" })).toBeDefined();
	},
);

test(
	"a band with no open view draws nothing of ours",
	ON,
	async ($: Engine, on: On) => {
		lab(on);
		const band = await mountBand($);

		expect(await band.findAll({ type: "Button" })).toEqual([]);
	},
);

test("a plugin left off draws nothing even with an offer in the store", async ($: Engine, on: On) => {
	lab(on, { store: { sessions: [openRow("offer")] } });
	const band = await mountBand($);

	expect(await band.findAll({ type: "Button" })).toEqual([]);
});
