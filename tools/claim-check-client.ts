// The two HTTP roads of `decider-claim-check.ts`, with the run's cost ledger. Neither key is printed or written.
import { env, spawn, write } from "bun";

import { CLAIM_CHECK } from "../plugins/claudetto/hooks/decider/claim-check.ts";
import type { Host } from "../plugins/claudetto/hooks/decider/questions.ts";
import { isRecord } from "../plugins/claudetto/hooks/tools.ts";
import {
	costOf,
	fail,
	field,
	numberOf,
	type Price,
} from "./claim-check-prices.ts";
import type { Call, JevStats } from "./claim-check-report.ts";

type Request = Parameters<Host["model"]["complete"]>[0];
type Result = Awaited<ReturnType<Host["model"]["complete"]>>;
type Usage = Extract<Result, { isAnswered: true }>["usage"];

export const JEV_ORIGIN = "https://api.typesafe.ai";

// The engine adds this room for thinking to the `maxTokens` a hook asks for (measured, design decision 16).
const ENGINE_THINKING_ROOM = 2048;
// A measuring run waits this long, so a slow request still reports its usage; `Call.limitMs` keeps the limit today's code sets.
const WAIT_MS = 180_000;
const NO_USAGE: Usage = {
	input_tokens: 0,
	output_tokens: 0,
	cache_read_input_tokens: 0,
	cache_creation_input_tokens: 0,
};

/** Everything one run shares: where to send, what it has spent, and what it measured. */
export interface Ctx {
	readonly anthropicUrl: string;
	readonly typesafeUrl: string;
	readonly anthropicKey: string;
	readonly typesafeKey: string;
	readonly prices: Readonly<Record<string, Price>>;
	readonly maxUsd: number;
	readonly outDir: string;
	readonly calls: Call[];
	readonly jev: JevStats;
	label: string;
	caseId: string;
	sent: number;
	usd: number;
	stopped: boolean;
	logLines: number;
}

/** A fresh run state for the given endpoints, keys, prices, cap, and payload folder. */
export const newCtx = (
	given: Pick<
		Ctx,
		| "anthropicUrl"
		| "typesafeUrl"
		| "anthropicKey"
		| "typesafeKey"
		| "prices"
		| "maxUsd"
		| "outDir"
	>,
): Ctx => ({
	...given,
	calls: [],
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
		...NO_USAGE,
		input_tokens: Math.ceil(body.length / 2),
		output_tokens: maxTokens,
	});

const blocks = (text: NonNullable<Request["system"]>) =>
	typeof text === "string"
		? [{ type: "text", text }]
		: text.map((block) => ({
				type: "text",
				text: block.text,
				...(block.cache === true
					? { cache_control: { type: "ephemeral" } }
					: {}),
			}));

// Captured from a real session against a fake Messages API: the keys sit in this order, a string `system` becomes one text block, and a string `prompt` stays a string.
// The engine also puts a billing-header block first in `system` and adds `metadata`; both change per session, so a run sends neither.
const wireBody = (request: Request): string =>
	JSON.stringify({
		model: request.model,
		max_tokens: (request.maxTokens ?? 0) + ENGINE_THINKING_ROOM,
		...(request.system === undefined ? {} : { system: blocks(request.system) }),
		messages: [
			{
				role: "user",
				content:
					typeof request.prompt === "string"
						? request.prompt
						: blocks(request.prompt),
			},
		],
		output_config: { effort: request.effort },
	});

const keep = async (ctx: Ctx, label: string, body: string): Promise<void> => {
	ctx.sent += 1;
	await write(`${ctx.outDir}/${ctx.caseId}.${label}.${ctx.sent}.json`, body);
};

const usageOf = (value: unknown): Usage => ({
	input_tokens: numberOf(field(value, "input_tokens")),
	output_tokens: numberOf(field(value, "output_tokens")),
	cache_read_input_tokens: numberOf(field(value, "cache_read_input_tokens")),
	cache_creation_input_tokens: numberOf(
		field(value, "cache_creation_input_tokens"),
	),
});

const textOf = (content: unknown): string =>
	Array.isArray(content)
		? content
				.filter((block) => field(block, "type") === "text")
				.map((block) => String(field(block, "text")))
				.join("")
		: "";

const answered = (status: number, usage: Usage, text: string): Result => {
	if (status >= 400) {
		return {
			isAnswered: false,
			reason: "api-error",
			status,
			error: "server_error",
			usage,
		};
	}
	return text === ""
		? { isAnswered: false, reason: "empty-reply", usage }
		: { isAnswered: true, text, usage };
};

const complete = async (ctx: Ctx, request: Request): Promise<Result> => {
	const price =
		ctx.prices[request.model] ?? fail(`No price for ${request.model}.`);
	const body = wireBody(request);
	const limit = (request.maxTokens ?? 0) + ENGINE_THINKING_ROOM;
	if (ctx.usd + worstCase(price, body, limit) > ctx.maxUsd) {
		ctx.stopped = true;
		return { isAnswered: false, reason: "aborted", usage: NO_USAGE };
	}
	await keep(ctx, ctx.label, body);
	const started = Date.now();
	const res = await fetch(`${ctx.anthropicUrl}/v1/messages`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"anthropic-version": "2023-06-01",
			"x-api-key": ctx.anthropicKey,
		},
		body,
		signal: AbortSignal.timeout(WAIT_MS),
	});
	const reply: unknown = await res.json();
	const usage = usageOf(field(reply, "usage"));
	ctx.usd += costOf(price, usage);
	ctx.calls.push({
		label: ctx.label,
		limit,
		output: usage.output_tokens,
		cacheRead: usage.cache_read_input_tokens,
		ms: Date.now() - started,
		limitMs: request.timeoutMs ?? WAIT_MS,
	});
	return answered(res.status, usage, textOf(field(reply, "content")));
};

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
		(p) => p > CLAIM_CHECK.noMax && p < CLAIM_CHECK.yesMin,
	).length;
};

const jevFetch =
	(ctx: Ctx): Host["http"]["fetch"] =>
	async (url, init) => {
		const body = typeof init?.body === "string" ? init.body : "";
		await keep(ctx, "decider-jev", body);
		const res = await fetch(url.replace(JEV_ORIGIN, ctx.typesafeUrl), {
			method: init?.method ?? "POST",
			headers: { ...init?.headers, authorization: `Bearer ${ctx.typesafeKey}` },
			body,
		});
		const text = await res.text();
		observeJev(ctx, body, res.status, text);
		return { status: res.status, ok: res.ok, headers: {}, text };
	};

const run: Host["process"]["run"] = async (argv, init) => {
	const proc = spawn([...argv], {
		stdin: new Blob([init?.stdin ?? ""]),
		env: { PATH: env["PATH"] ?? "", ...init?.env },
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		proc.stdout.text(),
		proc.stderr.text(),
		proc.exited,
	]);
	return {
		exitCode,
		stdout,
		stderr,
		isStdoutTruncated: false,
		isStderrTruncated: false,
	};
};

/** The `$` the Decider and today's grader read, wired to the two APIs. */
export const host = (ctx: Ctx): Host => ({
	env: {
		get: (name) =>
			Promise.resolve(
				name === "TYPESAFE_API_KEY" ? ctx.typesafeKey : undefined,
			),
	},
	http: { fetch: jevFetch(ctx) },
	process: { run },
	clock: {
		sleep: (ms, options) =>
			new Promise((resolve) => {
				const timer = setTimeout(resolve, ms);
				options?.signal?.addEventListener("abort", () => {
					clearTimeout(timer);
					resolve();
				});
			}),
	},
	model: { complete: (request) => complete(ctx, request) },
	ui: {
		log: (text) => {
			ctx.logLines += 1;
			console.error(text);
		},
	},
});
