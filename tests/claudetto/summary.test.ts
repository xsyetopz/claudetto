import { describe, expect, test } from "bun:test";
import type {
	ModelCompleteRequest,
	ModelCompleteResult,
	SessionCompactInput,
} from "claude-code";
import {
	type Ask,
	isCheapSummaryOn,
	SUMMARY_INSTRUCTIONS,
	SUMMARY_MAX_CHARS,
	SUMMARY_MAX_TOKENS,
	summarize,
	summaryRequest,
} from "../../plugins/claudetto/src/blocks/compaction/summary.ts";
import {
	TIERS,
	type TierRow,
} from "../../plugins/claudetto/src/tiers/tiers.ts";

const base = TIERS[0];
if (base === undefined) {
	throw new Error("the table has no row");
}

const ON: TierRow = { ...base, cheapSummary: true };

const USAGE = {
	input_tokens: 1,
	output_tokens: 1,
	cache_read_input_tokens: 0,
	cache_creation_input_tokens: 0,
};

const COMPACT: SessionCompactInput = {
	trigger: "auto",
	messages: [{ role: "user", text: "Build the export.", toolUses: [] }],
};

const asking = (reply: () => Promise<ModelCompleteResult>) => {
	const requests: ModelCompleteRequest[] = [];
	const lines: string[] = [];
	const seen = { requests, lines };
	const ask: Ask = {
		complete: (request) => {
			seen.requests.push(request);
			return reply();
		},
		log: (line) => {
			seen.lines.push(line);
		},
	};
	return { ask, seen };
};

describe("the rows leave the cheap summarizer off", () => {
	test("every row of the table has the field off", () => {
		expect(TIERS.map((row) => row.cheapSummary)).toEqual(
			TIERS.map(() => false),
		);
	});

	test("a row with the field off and no option asks for no call", () => {
		for (const row of TIERS) {
			expect(
				summaryRequest(COMPACT, isCheapSummaryOn(row, {})),
			).toBeUndefined();
		}
	});
});

describe("the switch of the cheap summarizer", () => {
	test("a row with the field on is on whatever the options say", () => {
		expect(isCheapSummaryOn(ON, {})).toBe(true);
	});

	test("the option turns it on where every row leaves it off", () => {
		expect(isCheapSummaryOn(base, { cheapSummary: "on" })).toBe(true);
	});

	test("the option turns it on with no row at all", () => {
		expect(isCheapSummaryOn(undefined, { cheapSummary: "on" })).toBe(true);
	});

	test("any other value of the option leaves it off", () => {
		expect([
			isCheapSummaryOn(base, { cheapSummary: "off" }),
			isCheapSummaryOn(base, { cheapSummary: "yes" }),
			isCheapSummaryOn(base, {}),
		]).toEqual([false, false, false]);
	});
});

describe("the request of a row that has it on", () => {
	test("it names `claude-haiku-5-5`, effort `high`, and a cap", () => {
		const request = summaryRequest(COMPACT, true);

		expect(request?.model).toBe("claude-haiku-5-5");
		expect(request?.effort).toBe("high");
		expect(request?.maxTokens).toBe(SUMMARY_MAX_TOKENS);
	});

	test("the fixed instructions ride a cached block and the transcript does not", () => {
		const request = summaryRequest(COMPACT, true);

		const blocks = Array.isArray(request?.prompt) ? request.prompt : [];
		expect(blocks.map((block) => block.cache === true)).toEqual([true, false]);
		expect(blocks[1]?.text).toContain("Build the export.");
	});

	test("a subagent compaction and a precompute ask for no call", () => {
		expect(summaryRequest({ ...COMPACT, agentId: "a1" }, true)).toBeUndefined();
		expect(
			summaryRequest({ ...COMPACT, trigger: "precompute" }, true),
		).toBeUndefined();
	});
});

describe("the answer to a compaction", () => {
	test("a reply becomes the one message and carries no usage", async () => {
		const { ask, seen } = asking(async () => ({
			isAnswered: true,
			text: "The summary.",
			usage: USAGE,
		}));

		const out = await summarize(COMPACT, ask, true);

		expect(seen.requests).toHaveLength(1);
		expect(out?.messages.map((message) => message.text)).toEqual([
			"The summary.",
		]);
		expect(out?.usage).toBeUndefined();
	});

	test("a call that throws gives no answer and one line, so the engine compacts", async () => {
		const { ask, seen } = asking(async () => {
			throw new Error("the provider is down");
		});

		const out = await summarize(COMPACT, ask, true);

		expect(out).toBeUndefined();
		expect(seen.lines).toHaveLength(1);
	});

	test("an empty reply and a cut call give no answer and one line", async () => {
		const empty = asking(async () => ({
			isAnswered: false,
			reason: "empty-reply",
			usage: USAGE,
		}));
		const blank = asking(async () => ({
			isAnswered: true,
			text: "  ",
			usage: USAGE,
		}));

		const first = await summarize(COMPACT, empty.ask, true);
		const second = await summarize(COMPACT, blank.ask, true);

		expect([first, second]).toEqual([undefined, undefined]);
		expect(empty.seen.lines).toHaveLength(1);
		expect(blank.seen.lines).toHaveLength(1);
	});

	test("the instructions name the character limit, so the model writes to it", () => {
		expect(SUMMARY_INSTRUCTIONS).toContain(`${SUMMARY_MAX_CHARS} characters`);
	});

	test("a reply over the limit is cut at its last line break within the limit, with one line", async () => {
		const line = `${"x".repeat(99)}\n`;
		const long = line.repeat(Math.ceil(SUMMARY_MAX_CHARS / line.length) + 1);
		const { ask, seen } = asking(async () => ({
			isAnswered: true,
			text: long,
			usage: USAGE,
		}));

		const text = (await summarize(COMPACT, ask, true))?.messages[0]?.text;

		expect(text?.length).toBeLessThanOrEqual(SUMMARY_MAX_CHARS);
		expect(text?.endsWith("x")).toBe(true);
		expect(long.startsWith(text ?? "?")).toBe(true);
		expect(seen.lines).toHaveLength(1);
	});

	test("a row with the field off makes no call", async () => {
		const { ask, seen } = asking(async () => {
			throw new Error("must not be called");
		});

		const out = await summarize(COMPACT, ask, isCheapSummaryOn(base, {}));

		expect(out).toBeUndefined();
		expect(seen.requests).toEqual([]);
	});
});
