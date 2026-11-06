import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { MODELS, type Model } from "../shared/model.ts";

const PER_MTOK = 1_000_000;
const HAIKU_TIER_TOKENS = 100_000;

export const RUN_CAP_TOKENS = 300_000;
export const GOAL_CAP_TOKENS = 2_000_000;

export interface Price {
	input: number;
	write5m: number;
	write1h: number;
	read: number;
	output: number;
}

export interface Usage {
	input_tokens: number;
	output_tokens: number;
	cache_read_input_tokens?: number;
	cache_creation_input_tokens?: number;
	cache_creation?: {
		ephemeral_5m_input_tokens?: number;
		ephemeral_1h_input_tokens?: number;
	};
}

export interface Entry {
	at: string;
	probe: string;
	runId: string;
	model: Model;
	tokens: { input: number; write: number; read: number; output: number };
	usd: number;
	note?: string;
}

export interface Ledger {
	entries: Entry[];
	totalTokens: number;
	totalUsd: number;
}

// Prices per MTok from https://platform.claude.com/docs/en/about-claude/pricing, read 2026-11-05.
export const PRICES: Record<Model, Price> = {
	[MODELS.opus]: {
		input: 4,
		write5m: 5,
		write1h: 8,
		read: 0.2,
		output: 20,
	},
	[MODELS.sonnet]: {
		input: 2,
		write5m: 2.5,
		write1h: 4,
		read: 0.1,
		output: 10,
	},
	[MODELS.haiku]: {
		input: 0.1,
		write5m: 0.125,
		write1h: 0.2,
		read: 0.01,
		output: 0.5,
	},
};

const HAIKU_LONG: Price = {
	input: 0.5,
	write5m: 0.625,
	write1h: 1,
	read: 0.05,
	output: 2.5,
};

export const isModel = (name: string): name is Model =>
	Object.hasOwn(PRICES, name);

export const tokensOf = (usage: Usage): Entry["tokens"] => {
	const split = splitWrites(usage);
	return {
		input: usage.input_tokens,
		write: split.w5m + split.w1h,
		read: usage.cache_read_input_tokens ?? 0,
		output: usage.output_tokens,
	};
};

// One call is one API request: the Haiku tier depends on that request's prompt size.
export const cost = (model: string, usage: Usage): number => {
	if (!isModel(model)) {
		throw new Error(
			`unknown model: ${model}`,
		);
	}
	const t = tokensOf(usage);
	const prompt = t.input + t.write + t.read;
	const p =
		model === MODELS.haiku && prompt > HAIKU_TIER_TOKENS
			? HAIKU_LONG
			: PRICES[model];
	const { w5m, w1h } = splitWrites(usage);
	const dollars =
		t.input * p.input +
		w5m * p.write5m +
		w1h * p.write1h +
		t.read * p.read +
		t.output * p.output;
	return dollars / PER_MTOK;
};

export const sumTokens = (t: Entry["tokens"]): number =>
	t.input + t.write + t.read + t.output;

export const readLedger = async (file: string): Promise<Ledger> => {
	const f = Bun.file(file);
	const text = (await f.exists()) ? await f.text() : "";
	const entries: Entry[] = text
		.split("\n")
		.filter((line) => line.trim() !== "")
		.map((line) => JSON.parse(line));
	return summarize(entries);
};

export const appendEntry = async (
	file: string,
	entry: Entry,
): Promise<Ledger> => {
	await mkdir(dirname(file), { recursive: true });
	await appendFile(file, `${JSON.stringify(entry)}\n`);
	return readLedger(file);
};

export const admit = (
	ledger: Ledger,
	opts: { bound: number; runCap?: number; goalCap?: number },
): { ok: boolean; reason: string } => {
	const runCap = opts.runCap ?? RUN_CAP_TOKENS;
	const goalCap = opts.goalCap ?? GOAL_CAP_TOKENS;
	if (opts.bound > runCap) {
		return {
			ok: false,
			reason: `run bound ${opts.bound} > cap ${runCap}`,
		};
	}
	if (ledger.totalTokens + opts.bound > goalCap) {
		return {
			ok: false,
			reason: `total ${ledger.totalTokens} + bound ${opts.bound} > cap ${goalCap}`,
		};
	}
	return {
		ok: true,
		reason: `${ledger.totalTokens} + ${opts.bound} <= ${goalCap}`,
	};
};

const splitWrites = (usage: Usage): { w5m: number; w1h: number } => {
	const c = usage.cache_creation;
	if (
		c &&
		(c.ephemeral_5m_input_tokens !== undefined ||
			c.ephemeral_1h_input_tokens !== undefined)
	) {
		return {
			w5m: c.ephemeral_5m_input_tokens ?? 0,
			w1h: c.ephemeral_1h_input_tokens ?? 0,
		};
	}
	return { w5m: usage.cache_creation_input_tokens ?? 0, w1h: 0 };
};

const summarize = (entries: Entry[]): Ledger => {
	let totalTokens = 0;
	let totalUsd = 0;
	for (const e of entries) {
		totalTokens += sumTokens(e.tokens);
		totalUsd += e.usd;
	}
	return { entries, totalTokens, totalUsd };
};
