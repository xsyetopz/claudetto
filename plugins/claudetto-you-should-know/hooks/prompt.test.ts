import { expect, test } from "claude-code/testing";

import { proposePrompt } from "./prompt";

/** FNV-1a 32 bit over UTF-16 code units. */
function fnv1a(text: string): number {
	let hash = 0x811c9dc5;
	for (let i = 0; i < text.length; i++) {
		hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193) >>> 0;
	}
	return hash;
}

test("the propose prompt is byte for byte the Claude Code 2.1.327 text", () => {
	const prompt = proposePrompt(["SEEN"], ["KNOWN"]);
	expect(prompt.length).toBe(33002);
	expect(fnv1a(prompt)).toBe(2879049419);
});
