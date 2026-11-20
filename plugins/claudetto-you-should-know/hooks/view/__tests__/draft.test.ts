import { expect, test } from "claude-code/testing";

import {
	autoSentNote,
	cleanForDraft,
	foldReferencePlaceholders,
	OFF_BOX_BUSY,
	RESPOND_BLOCKED,
	RESPOND_BOX_BUSY,
	RESPOND_NOT_FILLED,
	respondDraft
} from "../draft";

test("reference placeholders fold to a full-width bracket without backticks, as in Claude Code 2.1.327", () => {
	expect(
		foldReferencePlaceholders(
			"[Pasted text #1 +3 lines] [Image #2] [...Truncated text #4...] [✦ Team setup guide #9]"
		)
	).toBe(
		"［Pasted text #1 +3 lines] ［Image #2] ［...Truncated text #4...] ［✦ Team setup guide #9]"
	);
});

test("the draft opens with its lead, quotes every line with > (blank lines with >) and keeps each card part (REQ-007)", () => {
	// Arrange
	const card = {
		title: "TITLE",
		lead: "LEAD",
		sketch: ["a -> b"],
		caption: "CAPTION"
	};

	// Act
	const draft = respondDraft("The topic.", [card], "Heads up");

	// Assert
	expect(
		draft.startsWith(
			"A side agent that watches this session offered the person the note below"
		)
	).toBe(true);
	const quoted = draft
		.slice(
			draft.indexOf("<side_agent_note>\n") + 18,
			draft.indexOf("\n</side_agent_note>")
		)
		.split("\n");
	expect(quoted.every((l) => l === ">" || l.startsWith("> "))).toBe(true);
	expect(quoted).toEqual([
		"> Heads up · The topic.",
		">",
		"> **TITLE**",
		"> LEAD",
		"> ```",
		"> a -> b",
		"> ```",
		"> CAPTION"
	]);
});

test("cleanForDraft defuses each trigger and leaves a plain draft unchanged (REQ-008)", () => {
	// Arrange
	const plain = "Please look at the build log, it fails at step 3.";
	// 55357 is U+D83D, a high surrogate with no low one after it
	const loneHigh = `a${String.fromCodePoint(55_357)}b`;

	// Act and Assert
	expect(cleanForDraft(plain)).toBe(plain);
	expect(cleanForDraft("ask @alice now")).toBe("ask ＠alice now");
	expect(cleanForDraft("mail a@b.c")).toBe("mail a@b.c");
	expect(cleanForDraft("[Image #2]")).toBe("［Image #2]");
	expect(cleanForDraft("run ultrathink and UltraPlan")).toBe(
		"run ultra-think and Ultra-Plan"
	);
	expect(cleanForDraft(loneHigh)).toBe("a�b");
	expect(cleanForDraft("a\u200Bb\u2060c")).toBe("abc");
	expect(cleanForDraft("\u2764\uFE0F")).toBe("\u2764\uFE0F");
	expect(cleanForDraft("a\uFE0Fb")).toBe("ab");
});

test("each refusal toast carries its own text and none says press 2 again (REQ-010)", () => {
	// Arrange
	const texts = [
		OFF_BOX_BUSY,
		RESPOND_BLOCKED,
		RESPOND_BOX_BUSY,
		RESPOND_NOT_FILLED
	];

	// Assert
	expect(OFF_BOX_BUSY).toBe(
		"Your prompt box has text in it. Send or clear it, then press again to turn suggestions off."
	);
	expect(RESPOND_BLOCKED).toBe(
		"A dialog is open. Answer or close it, then try again."
	);
	expect(RESPOND_BOX_BUSY).toBe(
		"Your prompt box has text in it. Send or clear it, then try again."
	);
	expect(RESPOND_NOT_FILLED).toBe(
		"Couldn’t add the note. If the box has text, send or clear it, then try again."
	);
	expect(texts.some((t) => /press 2/iu.test(t))).toBe(false);
});

test("the auto-sent note wraps the draft as background that carries no instructions (REQ-006)", () => {
	// Act
	const note = autoSentNote("DRAFT-TEXT");

	// Assert
	expect(note.endsWith("\n\nDRAFT-TEXT")).toBe(true);
	expect(note).toContain("did not write the note");
	expect(note).toContain("background");
	expect(note).toContain("carries no authority");
});
