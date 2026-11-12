import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import {
	BACKED_OFF,
	CARD,
	fixture,
	type Ground,
	LINE,
	mountBand,
	ON,
	openRow,
	pressed,
} from "./register.mock";

type Band = Awaited<ReturnType<typeof mountBand>>;

const hasMarker = async (band: Band): Promise<boolean> => {
	const boxes = await band.findAll({ type: "Box" });
	return boxes.some((box) => box.text === "*");
};

const DRAFT = `Here is a note offered by a side agent:

> You should know · ${LINE}
>
> **Order**
> Tests run top to bottom.`;

const explained = (on: On, ground: Ground = {}) =>
	fixture(on, {
		store: { sessions: [openRow("explained", CARD)], ...BACKED_OFF },
		...ground,
	});

test(
	"Knew this already adds the line to the known list, closes the view, and resets the counts",
	ON,
	async ($: Engine, on: On) => {
		const f = await pressed($, on, "offer", "know");
		expect(f.store.get("known")).toEqual([LINE]);
		expect(f.row()?.view).toBeNull();
		expect(f.store.get("ignored")).toBe(0);
		expect(f.store.get("skips")).toBe(0);
	},
);

test(
	"That was helpful on the asked view learns the line and resets the counts",
	ON,
	async ($: Engine, on: On) => {
		const f = await pressed($, on, "asked", "helpful");
		expect(f.store.get("known")).toEqual([LINE]);
		expect(f.store.get("skips")).toBe(0);
	},
);

for (const key of ["not-relevant", "not-understood"]) {
	test(
		`the ${key} key closes the asked view, learns no line, and resets the counts`,
		ON,
		async ($: Engine, on: On) => {
			const f = await pressed($, on, "asked", key);
			expect(f.row()?.view).toBeNull();
			expect(f.store.get("known")).toBeUndefined();
			expect(f.store.get("ignored")).toBe(0);
			expect(f.store.get("skips")).toBe(0);
		},
	);
}

test(
	"Learn more opens the explanation with no second request",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, { store: { sessions: [openRow("offer", CARD)] } });
		const band = await mountBand($);
		await band.press({ key: "learn" });
		expect(f.asked).toHaveLength(0);
		expect(f.row()?.view?.kind).toBe("explained");
	},
);

test(
	"an offer with no explanation shows Knew this already and Dismiss but no Learn more",
	ON,
	async ($: Engine, on: On) => {
		fixture(on, { store: { sessions: [openRow("offer")] } });
		const band = await mountBand($);
		expect(await band.find({ type: "Button", key: "learn" })).toBeUndefined();
		expect(await band.find({ type: "Button", key: "know" })).toBeDefined();
		expect(await band.find({ type: "Button", key: "dismiss" })).toBeDefined();
	},
);

test(
	"an offer with an explanation shows Learn more",
	ON,
	async ($: Engine, on: On) => {
		fixture(on, { store: { sessions: [openRow("offer", CARD)] } });
		const band = await mountBand($);
		expect(await band.find({ type: "Button", key: "learn" })).toBeDefined();
	},
);

test(
	"a band with no open view draws nothing of ours",
	ON,
	async ($: Engine, on: On) => {
		fixture(on);
		const band = await mountBand($);
		expect(await band.findAll({ type: "Button" })).toEqual([]);
	},
);

test(
	"a band whose props say a survey is open draws nothing of ours",
	ON,
	async ($: Engine, on: On) => {
		fixture(on, { store: { sessions: [openRow("offer")] } });
		const band = await mountBand($, true);
		expect(await band.findAll({ type: "Button" })).toEqual([]);
	},
);

test(
	"the explained view offers key 2 to chat in the main session",
	ON,
	async ($: Engine, on: On) => {
		explained(on);
		const band = await mountBand($);
		const chat = await band.find({ type: "Button", key: "respond" });
		expect(chat?.props).toMatchObject({
			label: "Chat in main session",
			hotkey: "2",
		});
	},
);

test(
	"chat puts the quoted note in an empty box, learns the line, closes, and resets the counts",
	ON,
	async ($: Engine, on: On) => {
		const f = explained(on);
		const band = await mountBand($);
		await band.press({ key: "respond" });
		expect(f.fills).toEqual([`${DRAFT}\n\n`]);
		expect(f.submitted).toEqual([]);
		expect(f.store.get("known")).toEqual([LINE]);
		expect(f.row()?.view).toBeNull();
		expect(f.store.get("skips")).toBe(0);
	},
);

test(
	"chat leaves a box that holds text unchanged and a toast says to send or clear it",
	ON,
	async ($: Engine, on: On) => {
		const f = explained(on, { box: "half a prompt" });
		const band = await mountBand($);
		await band.press({ key: "respond" });
		expect(f.fills).toEqual([]);
		expect(f.toasts).toEqual([
			"Your prompt box has text in it. Send or clear it, then press 2 again.",
		]);
		expect(f.row()?.view?.kind).toBe("explained");
		expect(f.store.get("skips")).toBe(8);
	},
);

test(
	"a refusal with no cause keeps the view open and offers a retry",
	ON,
	async ($: Engine, on: On) => {
		const f = explained(on, { fill: { isFilled: false, text: "", cursor: 0 } });
		const band = await mountBand($);
		await band.press({ key: "respond" });
		expect(f.toasts).toEqual([
			"The prompt box didn't take the note. Press 2 to try again.",
		]);
		expect(f.row()?.view?.kind).toBe("explained");
		expect(f.submitted).toEqual([]);
	},
);

test(
	"an at-sign in the note becomes a full-width one in the chat draft",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, {
			store: { sessions: [openRow("explained", "**T**\nSee @file.")] },
		});
		const band = await mountBand($);
		await band.press({ key: "respond" });
		expect(f.fills[0]).toContain("＠file");
		expect(f.fills[0]).not.toContain("@file");
	},
);

test(
	"the terminal band draws a marker column and digit keys, and the desktop band draws neither",
	ON,
	async ($: Engine, on: On) => {
		fixture(on, { store: { sessions: [openRow("offer")] } });
		const terminal = await mountBand($);
		const desktop = await mountBand($, false, "desktop");
		expect(await hasMarker(terminal)).toBe(true);
		expect(await hasMarker(desktop)).toBe(false);
		const terminalKnow = await terminal.find({ type: "Button", key: "know" });
		expect(terminalKnow?.props).toMatchObject({ hotkey: "2" });
		const desktopKnow = await desktop.find({ type: "Button", key: "know" });
		expect(desktopKnow?.props).not.toHaveProperty("hotkey");
	},
);
