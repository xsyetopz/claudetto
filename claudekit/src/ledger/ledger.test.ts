import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { MODELS } from "../shared/model.ts";
import { tempDir } from "../shared/temp.ts";
import { admit, appendEntry, cost, readLedger } from "./ledger.ts";

const NO_PRICE = /unknown model/;

describe("cost", () => {
	test("matches the CLI's total_cost_usd for a recorded Opus run", () => {
		const usd = cost(MODELS.opus, {
			input_tokens: 2,
			output_tokens: 777,
			cache_read_input_tokens: 1641,
			cache_creation_input_tokens: 1604,
			cache_creation: {
				ephemeral_5m_input_tokens: 0,
				ephemeral_1h_input_tokens: 1604,
			},
		});
		expect(usd).toBeCloseTo(0.028_708_2, 9);
	});

	test("prices the cache write of a compaction, not only the hit", () => {
		const hitOnly = cost(MODELS.sonnet, {
			input_tokens: 0,
			output_tokens: 0,
			cache_read_input_tokens: 10_000,
		});
		const withWrite = cost(MODELS.sonnet, {
			input_tokens: 0,
			output_tokens: 0,
			cache_read_input_tokens: 10_000,
			cache_creation_input_tokens: 5000,
		});
		expect(withWrite - hitOnly).toBeCloseTo((5000 * 2.5) / 1e6, 12);
	});

	test("uses the long-prompt Haiku tier over 100,000 prompt tokens", () => {
		expect(
			cost(MODELS.haiku, { input_tokens: 100_000, output_tokens: 0 }),
		).toBeCloseTo(0.01, 12);
		expect(
			cost(MODELS.haiku, { input_tokens: 100_001, output_tokens: 0 }),
		).toBeCloseTo(0.050_000_5, 12);
	});

	test("refuses a model outside the table", () => {
		expect(() =>
			cost("claude-3-opus", { input_tokens: 1, output_tokens: 1 }),
		).toThrow(NO_PRICE);
	});
});

describe("ledger file", () => {
	test("keeps a running total across appends", async () => {
		const dir = await tempDir("ledger");
		const file = join(dir, "ledger.jsonl");
		const entry = {
			at: "2026-11-05T00:00:00Z",
			probe: "p",
			runId: "r",
			model: MODELS.haiku,
			tokens: { input: 10, write: 20, read: 30, output: 40 },
			usd: 0.5,
		};
		await appendEntry(file, entry);
		const after = await appendEntry(file, { ...entry, runId: "r2" });
		expect(after.totalTokens).toBe(200);
		expect(after.totalUsd).toBeCloseTo(1, 12);
		expect((await readLedger(join(dir, "missing.jsonl"))).totalTokens).toBe(0);
	});
});

describe("admit", () => {
	const ledger = { entries: [], totalTokens: 1_900_000, totalUsd: 0 };
	test("refuses a bound over the per-run cap", () => {
		expect(admit({ ...ledger, totalTokens: 0 }, { bound: 300_001 }).ok).toBe(
			false,
		);
	});
	test("refuses a bound that would pass the goal cap", () => {
		expect(admit(ledger, { bound: 100_001 }).ok).toBe(false);
	});
	test("admits a bound that fits both caps", () => {
		expect(admit(ledger, { bound: 100_000 }).ok).toBe(true);
	});
});
