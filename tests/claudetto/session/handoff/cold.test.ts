// The cold cache (task 3.11, D47): the handover offer waits for a cache older than the TTL.
// The TTL of a root session is 1 hour, which Claude Code picks with `CLAUDE_CODE_PROMPT_CACHE_TTL`.

import { expect, test } from "bun:test";
import {
	isCold,
	offerAnswer,
} from "../../../../plugins/claudetto/modules/session/handoff/cold.ts";
import { CACHE_TTL_MS } from "../../../../plugins/claudetto/modules/session/handoff/limits.ts";
import { SNIPPET } from "../../../../plugins/claudetto/modules/setup/prompts.ts";

test("the TTL of a root session is 1 hour", () => {
	expect(CACHE_TTL_MS).toBe(3_600_000);
});

test("a root session is cold after 1 hour", () => {
	const minute = 60_000;
	expect(isCold(30 * minute, 0)).toBe(false);
	expect(isCold(61 * minute, 0)).toBe(true);
});

test("a session with no request seen is cold, because it was resumed", () => {
	expect(isCold(0, null)).toBe(true);
});

test("the settings snippet gives a 1-hour cache to the main conversation", () => {
	expect(JSON.stringify(SNIPPET)).toContain(
		'"CLAUDE_CODE_PROMPT_CACHE_TTL":"1h"',
	);
});

// The offer is sure from P(yes) 0.7 and up to 0.3 (`primitives-noul.md`) (the user, 2026-10-23: "follow typesafe's guidelines/best practices").
test("Jev answers the offer from 0.7 for a yes and up to 0.3 for a no", () => {
	expect(offerAnswer(0.7)).toBe("Yes");
	expect(offerAnswer(0.71)).toBe("Yes");
	expect(offerAnswer(0.69)).toBeUndefined();
	expect(offerAnswer(0.5)).toBeUndefined();
	expect(offerAnswer(0.31)).toBeUndefined();
	expect(offerAnswer(0.3)).toBe("No");
	expect(offerAnswer(0.29)).toBe("No");
	expect(offerAnswer(undefined)).toBeUndefined();
});
