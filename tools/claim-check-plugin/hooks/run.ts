// The entry of the tuning runs: reads the job file, scores its cases with the scorer its `kind` names, and writes the summary and the final-line file. The engine loads this module, so it uses no Bun or node API.
import {
	field,
	numberOf,
	type Price,
	pricesOf,
} from "../../claim-check-prices.ts";
import { finalLine, type Findings, summary } from "../../claim-check-report.ts";
import { type Ctx, type Engine, newCtx } from "./client.ts";
import { scoreGate } from "./gate.ts";
import { scoreLedger } from "./ledger.ts";
import { scoreReply } from "./reply.ts";
import type { Scored } from "./scored.ts";

/** The runs this entry knows. */
export type Kind = "ledger" | "branch-gate" | "reply-register";

/** What the launcher hands the hook: the cases, the prices, the cap, and where each file goes. */
export interface Job {
	readonly kind: Kind;
	readonly cases: string;
	readonly prices: Readonly<Record<string, Price>>;
	readonly maxUsd: number;
	readonly typesafeUrl: string;
	readonly outDir: string;
	readonly summaryPath: string;
	readonly finalPath: string;
}

const kindOf = (value: unknown): Kind =>
	value === "ledger" || value === "reply-register" ? value : "branch-gate";

/** The job a file holds. */
export function jobOf(text: string): Job {
	const raw: unknown = JSON.parse(text);
	return {
		kind: kindOf(field(raw, "kind")),
		cases: String(field(raw, "cases")),
		prices: pricesOf(field(raw, "prices"), "The job"),
		maxUsd: numberOf(field(raw, "maxUsd")),
		typesafeUrl: String(field(raw, "typesafeUrl")),
		outDir: String(field(raw, "outDir")),
		summaryPath: String(field(raw, "summaryPath")),
		finalPath: String(field(raw, "finalPath")),
	};
}

// The engine takes `$` only as an argument of a call to a named function, so the scorer is chosen with an `if`, not looked up.
function scored($: Engine, ctx: Ctx, job: Job): Promise<Scored> {
	if (job.kind === "ledger") {
		return scoreLedger($, ctx, job.cases);
	}
	if (job.kind === "reply-register") {
		return scoreReply($, ctx, job.cases);
	}
	return scoreGate($, ctx, job.cases);
}

const exitCode = (ctx: Ctx): number => {
	if (ctx.failure !== undefined) {
		return 1;
	}
	return ctx.stopped ? 2 : 0;
};

/** Scores every case of the job, writes the summary and the final-line file, and returns. */
export async function runJob($: Engine, job: Job): Promise<void> {
	const ctx = newCtx(job);
	const findings: Findings = {
		...(await scored($, ctx, job)),
		calls: ctx.calls,
		jev: ctx.jev,
		tokens: ctx.tokens,
		usd: ctx.usd,
		stopped: ctx.stopped,
		failure: ctx.failure,
		logLines: ctx.logLines,
	};
	await $.fs.write(job.summaryPath, summary(findings));
	await $.fs.write(
		job.finalPath,
		JSON.stringify({ line: finalLine(findings), code: exitCode(ctx) }),
	);
}
