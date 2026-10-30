import { expect, test } from "claude-code/testing";
import { cleanForDraft } from "../src/draft.ts";

test("an at-mention folds to a full-width at sign, so the box attaches no file", () => {
	expect(cleanForDraft("see @src/a.ts and a@b.c")).toBe(
		"see ＠src/a.ts and a@b.c",
	);
});

test("a paste or image placeholder opens with a full-width bracket, so the box does not expand it", () => {
	expect(cleanForDraft("[Pasted text #2 +14 lines] and [Image #1]")).toBe(
		"［Pasted text #2 +14 lines] and ［Image #1]",
	);
});

test("an ultra keyword is split with a hyphen, so it triggers nothing", () => {
	expect(cleanForDraft("UltraThink and ultraplan")).toBe(
		"Ultra-Think and ultra-plan",
	);
});

test("a zero-width space is dropped and an emoji keeps its presentation selector", () => {
	expect(cleanForDraft("a​b ❤️")).toBe("ab ❤️");
});
