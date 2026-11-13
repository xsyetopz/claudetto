// The entry of the tuning run: reads the job file, scores its reply-register cases, and writes the summary and the final-line file. The engine loads this module, so it uses no Bun or node API.
import { field } from "../../claim-check-json.ts";
import { finalLine, type Findings, summary } from "../../claim-check-report.ts";
import { type Engine, newCtx } from "./client.ts";
import { scoreReply } from "./reply.ts";

/** What the launcher hands the hook: the cases, the Jev endpoint, and where each file goes. */
export interface Job {
	readonly cases: string;
	readonly typesafeUrl: string;
	readonly outDir: string;
	readonly summaryPath: string;
	readonly finalPath: string;
}

/** The job a file holds. */
export function jobOf(text: string): Job {
	const raw: unknown = JSON.parse(text);
	return {
		cases: String(field(raw, "cases")),
		typesafeUrl: String(field(raw, "typesafeUrl")),
		outDir: String(field(raw, "outDir")),
		summaryPath: String(field(raw, "summaryPath")),
		finalPath: String(field(raw, "finalPath")),
	};
}

/** Scores every case of the job, writes the summary and the final-line file, and returns. */
export async function runJob($: Engine, job: Job): Promise<void> {
	const ctx = newCtx(job);
	const findings: Findings = {
		...(await scoreReply($, ctx, job.cases)),
		jev: ctx.jev,
		logLines: ctx.logLines,
	};
	await $.fs.write(job.summaryPath, summary(findings));
	await $.fs.write(
		job.finalPath,
		JSON.stringify({ line: finalLine(findings) }),
	);
}
