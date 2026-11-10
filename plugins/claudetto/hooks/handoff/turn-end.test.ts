import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { HANDOVER_PROMPT } from "../texts-handoff.ts";
import { HANDOFF_DIR, HANDOFF_TITLE } from "./layout.ts";
import {
	compactedTo,
	DONE,
	FIRST,
	GITHUB_TOKEN,
	HANDOFF,
	lab,
} from "./turn-end.mock.ts";

test("a main-loop reply that starts with the title is saved, the conversation compacts to the first message, an assistant line, and the handoff, and the next prompt goes in", async ($: Engine, on: On) => {
	const { seen, finish } = lab($, on);

	await finish();

	expect(seen.written).toHaveLength(1);
	expect(seen.written[0]?.path).toContain(`${HANDOFF_DIR}/handoff-`);
	expect(seen.written[0]?.text).toBe(HANDOFF);
	const messages = compactedTo(seen);
	expect(messages?.[0]).toEqual(FIRST);
	expect(messages?.[1]).toMatchObject({ role: "assistant", toolUses: [] });
	expect(messages?.[2]).toMatchObject({ role: "user", text: HANDOFF });
	expect(messages).toHaveLength(3);
	expect(seen.sent).toEqual([HANDOVER_PROMPT]);
});

test("a reply without the title, below the size, starts no compaction and forks nothing", async ($: Engine, on: On) => {
	const { seen, finish } = lab($, on);

	await finish(DONE);

	expect(seen.runs).toBe(0);
	expect(seen.forks).toEqual([]);
	expect(seen.written).toEqual([]);
	expect(seen.sent).toEqual([]);
});

test("a reply without the title, at a context of 400,000 tokens, forks for a handoff, hands over to it, and leaves the next prompt to the user", async ($: Engine, on: On) => {
	const { seen, finish } = lab($, on, "compact", false, { tokens: 400_000 });

	await finish(DONE);

	expect(seen.forks).toHaveLength(1);
	expect(seen.forks[0]).toContain(HANDOFF_TITLE);
	expect(seen.written[0]?.text).toBe(HANDOFF);
	expect(compactedTo(seen)?.[2]).toMatchObject({ role: "user", text: HANDOFF });
	expect(seen.sent).toEqual([]);
});

test("a context under half of a small window forks nothing", async ($: Engine, on: On) => {
	const under = lab($, on, "compact", false, {
		tokens: 99_999,
		window: 200_000,
	});
	await under.finish(DONE);

	expect(under.seen.forks).toEqual([]);
});

test("a context at half of a small window forks", async ($: Engine, on: On) => {
	const { seen, finish } = lab($, on, "compact", false, {
		tokens: 100_000,
		window: 200_000,
	});

	await finish(DONE);

	expect(seen.forks).toHaveLength(1);
});

test(
	"handoverThresholdTokens sets the size a context must reach to fork",
	{ options: { handoverThresholdTokens: 600_000 } },
	async ($: Engine, on: On) => {
		const { seen, finish } = lab($, on, "compact", false, { tokens: 450_000 });

		await finish(DONE);

		expect(seen.forks).toEqual([]);
	},
);

test("a key the reply carries is redacted in the saved file and in the context the compaction keeps", async ($: Engine, on: On) => {
	const { seen, finish } = lab($, on);

	await finish({ answer: `${HANDOFF}\nThe token is ${GITHUB_TOKEN}.\n` });

	expect(seen.written[0]?.text).toContain("[REDACTED]");
	expect(seen.written[0]?.text).not.toContain(GITHUB_TOKEN);
	expect(JSON.stringify(compactedTo(seen))).not.toContain(GITHUB_TOKEN);
	expect(seen.sent).toEqual([HANDOVER_PROMPT]);
});
