// The kit strips a cause a test hook writes on `prompt.fill`, so the engine's two refusals are reached through `press` and plain ports.

import type { PromptFilled } from "claude-code";
import { expect, test } from "claude-code/testing";
import { press } from "../src/answer.ts";
import type { Ports } from "../src/ports.ts";
import { openRow, SESSION } from "./lab-kit.ts";

const portsOf = (filled: PromptFilled) => {
	const open = openRow("explained");
	const store = new Map<string, unknown>([
		[
			"sessions",
			[
				{
					...open,
					view: {
						...open.view,
						explanation: `**Order**
Top down.`,
					},
				},
			],
		],
		["looksToSkip", 8],
	]);
	const submitted: string[] = [];
	const toasts: string[] = [];
	const ports: Ports = {
		read: async (key) => store.get(key),
		write: async (key, value) => {
			store.set(key, value);
		},
		surfaces: async () => ["terminal"],
		ask: async () => undefined,
		refresh: () => undefined,
		later: () => undefined,
		now: () => 1000,
		box: async () => "",
		fill: async () => filled,
		submit: async (text) => {
			submitted.push(text);
		},
		toast: (text) => {
			toasts.push(text);
		},
	};
	return { ports, store, submitted, toasts };
};

test("a dialog holding the keys keeps the view open, the counters kept, and says so", async () => {
	const w = portsOf({
		isFilled: false,
		refusal: "dialog",
		text: "",
		cursor: 0,
	});

	await press(w.ports, SESSION, "respond");

	expect(w.toasts).toEqual([
		"A dialog has the keyboard. Answer it, then press 2 again.",
	]);
	expect(w.store.get("sessions")).toMatchObject([
		{ view: { kind: "explained" } },
	]);
	expect(w.store.get("looksToSkip")).toBe(8);
	expect(w.submitted).toEqual([]);
});

test("a session with no prompt box sends the note as a prompt, knows the line, and closes", async () => {
	const w = portsOf({
		isFilled: false,
		refusal: "no_composer",
		text: "",
		cursor: 0,
	});

	await press(w.ports, SESSION, "respond");

	expect(w.submitted).toEqual([
		`Here is a note offered by a side agent:

> You should know · Tests run in order.
>
> **Order**
> Top down.`,
	]);
	expect(w.store.get("known")).toEqual(["Tests run in order."]);
	expect(w.store.get("sessions")).toMatchObject([{ view: null }]);
	expect(w.store.get("looksToSkip")).toBe(0);
	expect(w.toasts).toEqual([]);
});
