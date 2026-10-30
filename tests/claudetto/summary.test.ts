import { describe, expect, test } from "bun:test";
import type {
	ModelCompleteRequest,
	ModelCompleteResult,
	SessionCompactInput,
} from "claude-code";
import {
	type Ask,
	isCheapSummaryOn,
	SUMMARY_MAX_TOKENS,
	summarize,
	summaryRequest,
} from "../../plugins/claudetto/src/summary.ts";
import {
	HAIKU_MODEL,
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

/** An `Ask` that records the requests and the lines, and answers with `reply`. */
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
				summaryRequest(row, COMPACT, isCheapSummaryOn(row, {})),
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

	test("the option on with no readable row still makes no call", () => {
		expect(summaryRequest(undefined, COMPACT, true)).toBeUndefined();
	});
});

describe("the request of a row that has it on", () => {
	test("it names the cheap model, the effort of the row and a cap", () => {
		const request = summaryRequest(ON, COMPACT, true);

		expect(request?.model).toBe(HAIKU_MODEL);
		expect(request?.effort).toBe("medium");
		expect(request?.maxTokens).toBe(SUMMARY_MAX_TOKENS);
	});

	test("the fixed instructions ride a cached block and the transcript does not", () => {
		const request = summaryRequest(ON, COMPACT, true);

		const blocks = Array.isArray(request?.prompt) ? request.prompt : [];
		expect(blocks.map((block) => block.cache === true)).toEqual([true, false]);
		expect(blocks[1]?.text).toContain("Build the export.");
	});

	test("a subagent compaction and a precompute ask for no call", () => {
		expect(
			summaryRequest(ON, { ...COMPACT, agentId: "a1" }, true),
		).toBeUndefined();
		expect(
			summaryRequest(ON, { ...COMPACT, trigger: "precompute" }, true),
		).toBeUndefined();
	});

	test("a row with no usable effort asks for no call", () => {
		expect(
			summaryRequest({ ...ON, effort: "turbo" }, COMPACT, true),
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

		const out = await summarize(ON, COMPACT, ask, true);

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

		const out = await summarize(ON, COMPACT, ask, true);

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

		const first = await summarize(ON, COMPACT, empty.ask, true);
		const second = await summarize(ON, COMPACT, blank.ask, true);

		expect([first, second]).toEqual([undefined, undefined]);
		expect(empty.seen.lines).toHaveLength(1);
		expect(blank.seen.lines).toHaveLength(1);
	});

	test("a row with the field off makes no call", async () => {
		const { ask, seen } = asking(async () => {
			throw new Error("must not be called");
		});

		const out = await summarize(base, COMPACT, ask, isCheapSummaryOn(base, {}));

		expect(out).toBeUndefined();
		expect(seen.requests).toEqual([]);
	});
});
