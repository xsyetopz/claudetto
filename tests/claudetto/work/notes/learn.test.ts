// The `learn:` block of a main reply.

import { expect, test } from "bun:test";
import {
	learnFilter,
	parseLearn,
} from "../../../../plugins/claudetto/modules/work/notes/domain/learn.ts";

const PATTERN_1 = /(?<=e)/;

/** The text that the filter lets through for `pieces`, one piece at a time. */
const filtered = (pieces: string[]): string[] => {
	const f = learnFilter();
	return [...pieces.map(f.push), f.end()];
};

test("the filter holds back a block that is cut across pieces", () => {
	const out = filtered([
		"done\n\nlea",
		"rn: probe line\ntag: Heads",
		" up\nexplain: x.",
	]);
	expect(out.join("")).toBe("done");
});

test("the filter lets a line through at once when it cannot start a block", () => {
	expect(filtered(["Hello wor", "ld\nnext"])).toEqual([
		"Hello wor",
		"ld\nnext",
		"",
	]);
});

test("the filter gives back a held line that is not a block", () => {
	expect(filtered(["a\n\nlea", "rning is fun\nb"]).join("")).toBe(
		"a\n\nlearning is fun\nb",
	);
	expect(filtered(["a\nlea"]).join("")).toBe("a\nlea");
});

test("an indented, capitalized, or fenced `learn:` line is reply text", () => {
	for (const reply of [
		"Set it:\n  learn: true\nDone.",
		"Set it:\nLearn: true\nDone.",
		"Set it:\n```yaml\nlearn: true\n```\nDone.",
		"Set it:\n~~~\nlearn: true\n~~~",
	]) {
		expect(parseLearn(reply)).toEqual({ shown: reply, note: null });
		expect(filtered([reply]).join("")).toBe(reply);
	}
	const fenced = "```\nlearn: a\n```\nDone.\nlearn: real";
	expect(parseLearn(fenced).shown).toBe("```\nlearn: a\n```\nDone.");
	expect(filtered(fenced.split(PATTERN_1)).join("")).toBe(
		"```\nlearn: a\n```\nDone.",
	);
});

test("the filter keeps the text before the last `learn:` line, as `parseLearn` does", () => {
	const reply = "a\nlearn: 1\ncode\nlearn: 2\ntag: T";
	expect(filtered([reply]).join("")).toBe(parseLearn(reply).shown);
});

test("a block with a tag and an explanation becomes a note, and the reply loses it", () => {
	const out = parseLearn(
		"Done.\n\nlearn: IS_DEMO also skips the trust dialog.\ntag: Heads up\nexplain:\nThe flag skips two dialogs.\nSee the docs.",
	);
	expect(out.shown).toBe("Done.");
	expect(out.note).toEqual({
		tag: "Heads up",
		line: "IS_DEMO also skips the trust dialog.",
		explain: "The flag skips two dialogs.\nSee the docs.",
	});
});

test("`learn: none` gives no note and the line is hidden", () => {
	expect(parseLearn("Done.\nlearn: none")).toEqual({
		shown: "Done.",
		note: null,
	});
});

test("a reply with no block stays whole", () => {
	expect(parseLearn("Done.\nlearning is fun")).toEqual({
		shown: "Done.\nlearning is fun",
		note: null,
	});
});

test("a block with no tag gets the default tag and the line as explanation", () => {
	expect(parseLearn("x\nlearn: Watch the cache.").note).toEqual({
		tag: "Note",
		line: "Watch the cache.",
		explain: "Watch the cache.",
	});
});
