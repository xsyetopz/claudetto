import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { BAND, type Ground, lab, openRow, TURNED_ON } from "./lab-kit.ts";

const ON = { options: TURNED_ON };

const backedOff = { typedPastInARow: 4, looksToSkip: 8 };

const explainedRow = (explanation: string) => {
	const open = openRow("explained");
	return { ...open, view: { ...open.view, explanation } };
};

const CARD = `**Order**
Tests run top to bottom.`;

const DRAFT = `Here is a note offered by a side agent:

> You should know · Tests run in order.
>
> **Order**
> Tests run top to bottom.`;
const open = async ($: Engine, on: On, ground: Ground = {}) => {
	const l = lab(on, {
		store: { sessions: [explainedRow(CARD)], ...backedOff },
		...ground,
	});
	const band = await $.ui.mount({
		plugin: "claudetto-you-should-know",
		surface: "terminal",
		component: "AbovePrompt",
		props: BAND,
	});
	return { l, band };
};

test(
	"the explained view offers `2` to chat in the main session",
	ON,
	async ($: Engine, on: On) => {
		const { band } = await open($, on);

		const chat = await band.find({ type: "Button", key: "respond" });

		expect(chat?.props).toMatchObject({
			label: "Chat in main session",
			hotkey: "2",
		});
	},
);

test(
	"chatting puts the quoted note in an empty box, knows the line, closes, and resets the counters",
	ON,
	async ($: Engine, on: On) => {
		const { l, band } = await open($, on);

		await band.press({ key: "respond" });

		expect(l.fills).toEqual([`${DRAFT}\n\n`]);
		expect(l.submitted).toEqual([]);
		expect(l.store.get("known")).toEqual(["Tests run in order."]);
		expect(l.store.get("sessions")).toMatchObject([{ view: null }]);
		expect(l.store.get("looksToSkip")).toBe(0);
	},
);

test(
	"a box with text in it is left alone, and the view and counters stay",
	ON,
	async ($: Engine, on: On) => {
		const { l, band } = await open($, on, { box: "half a prompt" });

		await band.press({ key: "respond" });

		expect(l.fills).toEqual([]);
		expect(l.toasts).toEqual([
			"Your prompt box has text in it. Send or clear it, then press 2 again.",
		]);
		expect(l.store.get("sessions")).toMatchObject([
			{ view: { kind: "explained" } },
		]);
		expect(l.store.get("looksToSkip")).toBe(backedOff.looksToSkip);
	},
);

test(
	"a refusal with no cause keeps the view open and offers a retry",
	ON,
	async ($: Engine, on: On) => {
		const { l, band } = await open($, on, { fill: { isFilled: false } });

		await band.press({ key: "respond" });

		expect(l.toasts).toEqual([
			"The prompt box didn't take the note. Press 2 to try again.",
		]);
		expect(l.submitted).toEqual([]);
	},
);
