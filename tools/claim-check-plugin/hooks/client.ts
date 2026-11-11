// The `Host` of a tuning run: the engine's own `$`, wrapped to keep the cost ledger, each request, and the Jev stats. The engine loads this module, so it uses no Bun or node API.
import {
	type Host,
	THRESHOLDS,
} from "../../../plugins/claudetto/hooks/decider/questions.ts";
import { isRecord } from "../../../plugins/claudetto/hooks/tools.ts";
import {
	costOf,
	fail,
	field,
	type Price,
	type Usage,
} from "../../claim-check-prices.ts";
import type { Call, JevStats } from "../../claim-check-report.ts";

type Request = Parameters<Host["model"]["complete"]>[0];
type Result = Awaited<ReturnType<Host["model"]["complete"]>>;

/** What the engine's `$` gives the tuning hook beyond the `Host`. */
export type Engine = Host & {
	readonly fs: { write: (path: string, text: string) => Promise<void> };
};

export const JEV_ORIGIN = "https://api.typesafe.ai";

// The engine adds this room for thinking to the `maxTokens` a hook asks for, so the worst case counts it.
const ENGINE_THINKING_ROOM = 2048;
// A measuring run waits this long, so a slow request still reports its usage; `Call.limitMs` keeps the limit today's code sets.
const WAIT_MS = 180_000;
const noUsage = (): Usage => ({
	input_tokens: 0,
	output_tokens: 0,
	cache_read_input_tokens: 0,
	cache_creation_input_tokens: 0,
});

/** Everything one run shares: where Jev is, what it has spent, and what it measured. */
export interface Ctx {
	readonly typesafeUrl: string;
	readonly prices: Readonly<Record<string, Price>>;
	readonly maxUsd: number;
	readonly outDir: string;
	readonly calls: Call[];
	readonly tokens: Map<string, Usage>;
	readonly jev: JevStats;
	label: string;
	caseId: string;
	sent: number;
	usd: number;
	stopped: boolean;
	logLines: number;
}

/** A fresh run state for the given Jev endpoint, prices, cap, and payload folder. */
export const newCtx = (
	given: Pick<Ctx, "typesafeUrl" | "prices" | "maxUsd" | "outDir">,
): Ctx => ({
	...given,
	calls: [],
	tokens: new Map(),
	jev: {
		requests: 0,
		refused: 0,
		nouls: 0,
		banded: 0,
		maxChars: 0,
		maxTokens: undefined,
		usageKeys: new Set(),
	},
	label: "",
	caseId: "",
	sent: 0,
	usd: 0,
	stopped: false,
	logLines: 0,
});

// A token is at most a few characters, so half the body's length bounds the input from above.
const worstCase = (price: Price, body: string, maxTokens: number): number =>
	costOf(price, {
		...noUsage(),
		input_tokens: Math.ceil(body.length / 2),
		output_tokens: maxTokens,
	});

/** Saves a request and returns the function that saves its response beside it. */
async function keep(
	$: Engine,
	ctx: Ctx,
	label: string,
	body: string,
): Promise<(response: string) => Promise<void>> {
	ctx.sent += 1;
	const stem = `${ctx.outDir}/${ctx.caseId}.${label}.${ctx.sent}`;
	await $.fs.write(`${stem}.json`, body);
	return (response) => $.fs.write(`${stem}.response.json`, response);
}

/** Runs `one` on each case in turn, so each request is checked against the cap before it is sent, and stops when the cap stops the run. */
export async function eachCase<T>(
	ctx: Pick<Ctx, "stopped">,
	cases: readonly T[],
	one: (c: T) => Promise<void>,
): Promise<void> {
	const [c, ...rest] = cases;
	if (c === undefined || ctx.stopped) {
		return;
	}
	await one(c);
	await eachCase(ctx, rest, one);
}

const addTokens = (ctx: Ctx, model: string, usage: Usage): void => {
	const total = ctx.tokens.get(model) ?? noUsage();
	ctx.tokens.set(model, {
		input_tokens: total.input_tokens + usage.input_tokens,
		output_tokens: total.output_tokens + usage.output_tokens,
		cache_read_input_tokens:
			total.cache_read_input_tokens + usage.cache_read_input_tokens,
		cache_creation_input_tokens:
			total.cache_creation_input_tokens + usage.cache_creation_input_tokens,
	});
};

async function complete(
	$: Engine,
	ctx: Ctx,
	request: Request,
): Promise<Result> {
	const price =
		ctx.prices[request.model] ?? fail(`No price for ${request.model}.`);
	const body = JSON.stringify(request);
	const limit = (request.maxTokens ?? 0) + ENGINE_THINKING_ROOM;
	if (ctx.usd + worstCase(price, body, limit) > ctx.maxUsd) {
		ctx.stopped = true;
		return { isAnswered: false, reason: "aborted", usage: noUsage() };
	}
	const saveResponse = await keep($, ctx, ctx.label, body);
	const started = Date.now();
	const result = await $.model.complete({ ...request, timeoutMs: WAIT_MS });
	await saveResponse(JSON.stringify(result));
	ctx.usd += costOf(price, result.usage);
	addTokens(ctx, request.model, result.usage);
	ctx.calls.push({
		label: ctx.label,
		limit,
		output: result.usage.output_tokens,
		cacheRead: result.usage.cache_read_input_tokens,
		ms: Date.now() - started,
		limitMs: request.timeoutMs ?? WAIT_MS,
	});
	return result;
}

const noulsIn = (answers: unknown): number[] =>
	Object.values(isRecord(answers) ? answers : {})
		.map((answer) => field(answer, "noul"))
		.filter((p) => typeof p === "number");

const observeJev = (
	ctx: Ctx,
	request: string,
	status: number,
	text: string,
) => {
	const jev = ctx.jev;
	jev.requests += 1;
	if (status !== 200) {
		jev.refused += 1;
		return;
	}
	const state = field(JSON.parse(request), "state");
	jev.maxChars = Math.max(
		jev.maxChars,
		Object.values(isRecord(state) ? state : {}).join("").length,
	);
	const reply: unknown = JSON.parse(text);
	const usage = field(reply, "usage");
	for (const name of isRecord(usage) ? Object.keys(usage) : []) {
		jev.usageKeys.add(name);
	}
	const tokens = field(usage, "input_tokens");
	if (typeof tokens === "number") {
		jev.maxTokens = Math.max(jev.maxTokens ?? 0, tokens);
	}
	const ps = noulsIn(field(reply, "answers"));
	jev.nouls += ps.length;
	jev.banded += ps.filter(
		(p) => p > THRESHOLDS.noMax && p < THRESHOLDS.yesMin,
	).length;
};

function jevFetch($: Engine, ctx: Ctx): Host["http"]["fetch"] {
	return async (url, init) => {
		const body = typeof init?.body === "string" ? init.body : "";
		const saveResponse = await keep($, ctx, "decider-jev", body);
		const res = await $.http.fetch(url.replace(JEV_ORIGIN, ctx.typesafeUrl), {
			...init,
			method: init?.method ?? "POST",
			body,
		});
		await saveResponse(JSON.stringify({ status: res.status, text: res.text }));
		observeJev(ctx, body, res.status, res.text);
		return res;
	};
}

/** The `$` the Decider and today's grader read: the engine's, with the model and Jev calls measured. */
export function host($: Engine, ctx: Ctx): Host {
	return {
		env: {
			get: (name) =>
				name === "TYPESAFE_API_KEY"
					? $.env.get("TYPESAFE_API_KEY")
					: Promise.resolve(""),
		},
		process: { run: (argv, init) => $.process.run(argv, init) },
		clock: { sleep: (ms, options) => $.clock.sleep(ms, options) },
		http: { fetch: jevFetch($, ctx) },
		model: { complete: (request) => complete($, ctx, request) },
		ui: {
			log: (text) => {
				ctx.logLines += 1;
				$.ui.log(text);
			},
		},
	};
}
