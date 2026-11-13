// The `Host` of a tuning run: the engine's own `$`, wrapped to keep each Jev request and the Jev stats. The engine loads this module, so it uses no Bun or node API.
import {
	type Host as DeciderHost,
	THRESHOLDS,
} from "../../../plugins/claudetto/hooks/decider/questions.ts";
import { isRecord } from "../../../plugins/claudetto/hooks/tools.ts";
import { field } from "../../claim-check-json.ts";
import type { JevStats } from "../../claim-check-report.ts";

/** What the engine's `$` gives the tuning hook beyond the `Host`. */
export type Engine = DeciderHost & {
	readonly fs: { write: (path: string, text: string) => Promise<void> };
};

export const JEV_ORIGIN = "https://api.typesafe.ai";

/** Everything one run shares: where Jev is, and what it measured. */
export interface Ctx {
	readonly typesafeUrl: string;
	readonly outDir: string;
	readonly jev: JevStats;
	caseId: string;
	sent: number;
	logLines: number;
}

/** A fresh run state for the given Jev endpoint and payload folder. */
export const newCtx = (given: Pick<Ctx, "typesafeUrl" | "outDir">): Ctx => ({
	...given,
	jev: {
		requests: 0,
		refused: 0,
		nouls: 0,
		banded: 0,
		maxChars: 0,
		maxTokens: undefined,
		usageKeys: new Set(),
	},
	caseId: "",
	sent: 0,
	logLines: 0,
});

/** Saves a Jev request and returns the function that saves its response beside it. */
async function keep(
	$: Engine,
	ctx: Ctx,
	body: string,
): Promise<(response: string) => Promise<void>> {
	ctx.sent += 1;
	const stem = `${ctx.outDir}/${ctx.caseId}.decider-jev.${ctx.sent}`;
	await $.fs.write(`${stem}.json`, body);
	return (response) => $.fs.write(`${stem}.response.json`, response);
}

/** Runs `one` on each case in turn. */
export async function eachCase<T>(
	cases: readonly T[],
	one: (c: T) => Promise<void>,
): Promise<void> {
	const [c, ...rest] = cases;
	if (c === undefined) {
		return;
	}
	await one(c);
	await eachCase(rest, one);
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

function jevFetch($: Engine, ctx: Ctx): DeciderHost["http"]["fetch"] {
	return async (url, init) => {
		const body = typeof init?.body === "string" ? init.body : "";
		const saveResponse = await keep($, ctx, body);
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

/** The `$` the Decider reads: the engine's, with the Jev calls measured. */
export function host($: Engine, ctx: Ctx): DeciderHost {
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
		ui: {
			log: (text) => {
				ctx.logLines += 1;
				$.ui.log(text);
			},
		},
	};
}
