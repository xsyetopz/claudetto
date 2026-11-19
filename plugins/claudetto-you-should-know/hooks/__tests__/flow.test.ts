import { expect, test } from "claude-code/testing";

import { type Box, offered, pause } from "./testkit";

test("Learn more shows the explanation that came with the offer, without a second fork", async ($, on) => {
	const box: Box = { text: "", filled: [], toasts: [], forks: 0 };
	const band = await offered($, on, box);
	await band.press({ key: "Learn more" });
	for (let i = 0; i < 50 && (await band.find({ key: "Understood" })) === undefined; i++) {
		await pause();
	}
	expect(await band.find({ key: "Understood" })).toBeDefined();
	expect(await band.find({ key: "Chat in main session" })).toBeDefined();
	expect(JSON.stringify(await band.drawn())).toContain("They run one after another");
	expect(box.forks).toBe(1);
});

test("Knew this already clears the offer with no toast", async ($, on) => {
	const box: Box = { text: "", filled: [], toasts: [], forks: 0 };
	const band = await offered($, on, box);
	await band.press({ key: "Knew this already" });
	for (let i = 0; i < 50 && (await band.find({ key: "Learn more" })) !== undefined; i++) {
		await pause();
	}
	expect(await band.find({ key: "Learn more" })).toBeUndefined();
	expect(box.toasts).toEqual([]);
});

test("Dismiss shows the asked row with its one-shot buttons", async ($, on) => {
	const box: Box = { text: "", filled: [], toasts: [], forks: 0 };
	const band = await offered($, on, box);
	await band.press({ key: "Dismiss" });
	for (let i = 0; i < 50 && (await band.find({ key: "Not relevant" })) === undefined; i++) {
		await pause();
	}
	expect(await band.find({ key: "That was helpful" })).toBeDefined();
	expect(await band.find({ key: "Not relevant" })).toBeDefined();
});

test("Disable arms on the first press, then fills the off command and never runs it", async ($, on) => {
	const box: Box = { text: "", filled: [], toasts: [], forks: 0 };
	const band = await offered($, on, box);
	await band.press({ key: "Disable" });
	await pause();
	expect(box.filled).toEqual([]);
	await band.press({ key: "Press again to disable" });
	for (let i = 0; i < 50 && box.filled.length === 0; i++) {
		await pause();
	}
	expect(box.filled).toEqual(["/plugin disable claudetto-you-should-know"]);
});

test("Disable with text in the box toasts and fills nothing", async ($, on) => {
	const box: Box = { text: "half a thought", filled: [], toasts: [], forks: 0 };
	const band = await offered($, on, box);
	await band.press({ key: "Disable" });
	await pause();
	await band.press({ key: "Press again to disable" });
	for (let i = 0; i < 50 && box.toasts.length === 0; i++) {
		await pause();
	}
	expect(box.toasts.length).toBe(1);
	expect(box.filled).toEqual([]);
});
