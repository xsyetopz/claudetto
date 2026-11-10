import type {
	ModelForkResult,
	On,
	SessionCompactResult,
	SessionMessage,
} from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

import { scanner } from "../secrets.mock.ts";
import { HANDOVER_PROMPT } from "../texts.ts";
import { HANDOFF_DIR, HANDOFF_TITLE } from "./layout.ts";

const HANDOFF = `# Handoff

Written by Claude at 2026-11-02T10:00:00Z.

## Next steps

Ship the export.
`;

const FIRST: SessionMessage = {
	role: "user",
	text: "<env>the first turn's block</env>",
	toolUses: [],
	handle: "h0",
};

const LATER: SessionMessage = {
	role: "assistant",
	text: "Read the export code.",
	toolUses: [],
	handle: "h1",
};

const done = {
	durationMs: 1,
	isAborted: false,
	reason: "answer",
	turnId: "t1",
} as const;

const DONE = { answer: "Done. The export ships." };

interface Seen {
	runs: number;
	compacted: SessionCompactResult[];
	written: { path: string; text: string }[];
	sent: string[];
	lines: string[];
	forks: string[];
}

/** The live context at the turn's end, and what a fork of it answers. */
interface Context {
	readonly tokens?: number;
	readonly window?: number;
	readonly fork?: ModelForkResult;
}

const forked = (text: string): ModelForkResult => ({
	isAnswered: true,
	text,
	usage: {
		input_tokens: 2,
		output_tokens: 300,
		cache_read_input_tokens: 450_000,
		cache_creation_input_tokens: 400,
	},
});

/** How the stubbed `/compact` goes: compacts as a typed one would, throws, or runs no compaction. */
type Run = "compact" | "throw" | "none";

interface Ending {
	readonly answer?: string;
	readonly agentId?: string;
	readonly isAborted?: boolean;
	readonly reason?: "answer" | "aborted";
}

/**
 * `command.run` stands in for the engine's `/compact`. A stub may not call `$`, so in `compact` it waits
 * while the case compacts the main transcript, as a typed `/compact` would, and then returns.
 */
const GITHUB_TOKEN = `ghp_${"b".repeat(36)}`;

const lab = (
	$: Engine,
	on: On,
	run: Run = "compact",
	refuseSubmit = false,
	context: Context = {},
) => {
	scanner(on, [GITHUB_TOKEN]);
	const seen: Seen = {
		runs: 0,
		compacted: [],
		written: [],
		sent: [],
		lines: [],
		forks: [],
	};
	let release = (): void => undefined;
	const held = new Promise<void>((resolve) => {
		release = resolve;
	});
	const clock = mock.clock(on, { now: 0 });
	on("env.get", () => ({ value: undefined }));
	on("session.root", () => ({ value: "/repo" }));
	on("ui.log", (_$, e) => {
		seen.lines.push(e.text);
		return { value: undefined };
	});
	on("fs.write", (_$, e) => {
		seen.written.push({ path: e.path, text: e.text });
		return { value: undefined };
	});
	on("command.run", async () => {
		seen.runs += 1;
		if (run === "throw") {
			throw new Error("compact refused");
		}
		if (run === "compact") {
			await held;
		}
		return { text: "" };
	});
	on("prompt.submit", (_$, e) => {
		if (refuseSubmit) {
			throw new Error("submit refused");
		}
		seen.sent.push(e.text);
		return { text: e.text };
	});
	on("session.compact", () => ({ skip: "core ran" }));
	on("session.usage", () => ({
		value: {
			startedAt: 0,
			context: {
				tokens: context.tokens ?? 1000,
				window: context.window ?? 1_000_000,
			},
			rateLimits: [],
		},
	}));
	on("model.fork", (_$, e) => {
		seen.forks.push(e.prompt);
		return { value: context.fork ?? forked(HANDOFF) };
	});
	on("turn.complete", () => ({ text: "" }));
	/** Ends a turn and lets the handover run to its end. */
	const finish = async (e: Ending = {}): Promise<void> => {
		await $.turn.complete({ ...done, answer: HANDOFF, ...e });
		await clock.settle();
		if (run === "compact" && seen.runs === 1) {
			seen.compacted.push(
				await $.session.compact({
					trigger: "manual",
					messages: [FIRST, LATER],
				}),
			);
		}
		release();
		await clock.settle();
	};
	return { seen, finish };
};

const compactedTo = (seen: Seen): readonly SessionMessage[] | undefined => {
	const compacted = seen.compacted[0];
	return compacted && "skip" in compacted ? [] : compacted?.messages;
};

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

const MISSED: readonly { readonly run: Run; readonly how: string }[] = [
	{ run: "throw", how: "whose hook fails" },
	{ run: "none", how: "that runs no compaction" },
];

for (const { run, how } of MISSED) {
	test(`a \`/compact\` ${how} submits no prompt, logs one line, and leaves the next compaction to the engine`, async ($: Engine, on: On) => {
		const { seen, finish } = lab($, on, run);

		await finish();
		const later = await $.session.compact({
			trigger: "auto",
			messages: [FIRST, LATER],
		});

		expect(seen.sent).toEqual([]);
		expect(seen.lines).toHaveLength(1);
		expect(later.skip).toBe("core ran");
	});
}

test("a refused next prompt logs one line that says the compaction stands", async ($: Engine, on: On) => {
	const { seen, finish } = lab($, on, "compact", true);

	await finish();

	expect(seen.compacted).toHaveLength(1);
	expect(seen.lines).toHaveLength(1);
	expect(seen.lines[0]).toContain("The conversation was compacted");
});

test("a key the reply carries is redacted in the saved file and in the context the compaction keeps", async ($: Engine, on: On) => {
	const { seen, finish } = lab($, on);

	await finish({ answer: `${HANDOFF}\nThe token is ${GITHUB_TOKEN}.\n` });

	expect(seen.written[0]?.text).toContain("[REDACTED]");
	expect(seen.written[0]?.text).not.toContain(GITHUB_TOKEN);
	expect(JSON.stringify(compactedTo(seen))).not.toContain(GITHUB_TOKEN);
	expect(seen.sent).toEqual([HANDOVER_PROMPT]);
});
