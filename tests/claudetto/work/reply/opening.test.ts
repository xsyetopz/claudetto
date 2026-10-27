// The text that the judge of a reply opening reads: the first sentences of the reply, and the last request of the user.

import { expect, test } from "bun:test";
import {
	lastRequest,
	openingOf,
} from "../../../../plugins/claudetto/modules/work/reply/domain/opening.ts";

test("the opening is the first 3 sentences, joined", () => {
	expect(openingOf("One. Two! Three? Four.")).toBe("One. Two! Three?");
});

test("a leading mark of Markdown is cut, and a line break ends a sentence", () => {
	expect(openingOf("> **You're right**, sorry\nNext line")).toBe(
		"You're right**, sorry Next line",
	);
});

test("a sentence of a later part of the reply is not in the opening", () => {
	const reply =
		"`bun check` reports 2 faults. Fixing both. Done.\nYou're right.";
	expect(openingOf(reply)).not.toContain("right");
});

test("a reply in another language ends a sentence at its own mark", () => {
	expect(openingOf("Tienes razón。 Lo arreglo。 Listo。 Más。")).toBe(
		"Tienes razón。 Lo arreglo。 Listo。",
	);
});

test("an empty reply has an empty opening", () => {
	expect(openingOf("  \n ")).toBe("");
});

test("the last request is the newest text that the user typed, with no reminder", () => {
	const messages = [
		{ role: "user", text: "first" },
		{ role: "assistant", text: "reply" },
		{ role: "user", text: "second <system-reminder>x</system-reminder>" },
		{ role: "user", text: "<command-name>/x</command-name>" },
	];
	expect(lastRequest(messages)).toBe("second");
	expect(lastRequest([])).toBe("");
});
