import type { ModelForkResult, On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { DONE, FIRST, forked, lab, LATER, type Run } from "./turn-end.mock.ts";

const NO_HANDOFF: readonly {
	readonly fork: ModelForkResult;
	readonly how: string;
}[] = [
	{ fork: forked("Here is a summary."), how: "a reply without the title" },
	{
		fork: { isAnswered: false, reason: "nothing-to-fork" },
		how: "no reply",
	},
];

for (const { fork, how } of NO_HANDOFF) {
	test(`a fork that answers with ${how} starts no compaction and logs one line`, async ($: Engine, on: On) => {
		const { seen, finish } = lab($, on, "compact", false, {
			tokens: 450_000,
			fork,
		});

		await finish(DONE);

		expect(seen.runs).toBe(0);
		expect(seen.written).toEqual([]);
		expect(seen.lines).toHaveLength(1);
	});
}

test("after a fork without a handoff, no turn's end forks again until a compaction", async ($: Engine, on: On) => {
	const { seen, finish } = lab($, on, "compact", false, {
		tokens: 450_000,
		fork: forked("Here is a summary."),
	});

	await finish(DONE);
	await finish(DONE);
	expect(seen.forks).toHaveLength(1);

	await $.session.compact({ trigger: "auto", messages: [FIRST, LATER] });
	await finish(DONE);
	expect(seen.forks).toHaveLength(2);
});

test("a turn after a handover that ends still at the size forks nothing and logs one line, so the session does not hand over in a loop", async ($: Engine, on: On) => {
	const { seen, finish } = lab($, on, "compact", false, { tokens: 450_000 });

	await finish(DONE);
	await finish(DONE);

	expect(seen.forks).toHaveLength(1);
	expect(seen.lines).toHaveLength(1);
});

test("a subagent's turn at a large context forks nothing", async ($: Engine, on: On) => {
	const { seen, finish } = lab($, on, "compact", false, { tokens: 450_000 });

	await finish({ ...DONE, agentId: "a1" });

	expect(seen.forks).toEqual([]);
});

test("a subagent's handoff reply starts no compaction", async ($: Engine, on: On) => {
	const { seen, finish } = lab($, on);

	await finish({ agentId: "a1" });

	expect(seen.runs).toBe(0);
	expect(seen.sent).toEqual([]);
});

test("an interrupted turn starts no compaction", async ($: Engine, on: On) => {
	const { seen, finish } = lab($, on);

	await finish({ isAborted: true, reason: "aborted" });

	expect(seen.runs).toBe(0);
});

test("a compaction typed after the handover goes to the engine", async ($: Engine, on: On) => {
	const { finish } = lab($, on);

	await finish();
	const later = await $.session.compact({
		trigger: "manual",
		messages: [FIRST, LATER],
	});

	expect(later.skip).toBe("core ran");
});

const MISSED: readonly {
	readonly run: Run;
	readonly how: string;
	readonly says: string;
}[] = [
	{ run: "throw", how: "whose hook fails", says: "compaction failed" },
	{ run: "none", how: "that runs no compaction", says: "answered elsewhere" },
];

for (const { run, how, says } of MISSED) {
	test(`a \`/compact\` ${how} submits no prompt, logs one line, and leaves the next compaction to the engine`, async ($: Engine, on: On) => {
		const { seen, finish } = lab($, on, run);

		await finish();
		const later = await $.session.compact({
			trigger: "auto",
			messages: [FIRST, LATER],
		});

		expect(seen.sent).toEqual([]);
		expect(seen.lines).toHaveLength(1);
		expect(seen.lines[0]).toContain(says);
		expect(later.skip).toBe("core ran");
	});
}

test("a refused next prompt keeps the compaction and logs one line", async ($: Engine, on: On) => {
	const { seen, finish } = lab($, on, "compact", true);

	await finish();

	expect(seen.compacted).toHaveLength(1);
	expect(seen.lines).toHaveLength(1);
	expect(seen.lines[0]).toContain("The conversation was compacted");
});
