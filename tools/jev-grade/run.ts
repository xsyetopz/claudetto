import { join } from "node:path";

import { callJev, type Fetch, type Sleep } from "./client";
import { type JevConfig, loadConfig } from "./config";
import { buildRequest } from "./request";
import {
	type CaseRecord,
	findAggregate,
	readAggregate,
	readReply,
	type RunRecord
} from "./results";
import { runScore } from "./score";

/** The two ablation arms. */
export const ARMS = ["with", "without"] as const;
/** One arm. */
export type Arm = (typeof ARMS)[number];

/** One run's outcome: scored, or an error, never both. */
export interface RunOutcome {
	readonly arm: Arm;
	readonly index: number;
	readonly engineScore: number | undefined;
	readonly noul?: Readonly<Record<string, number>>;
	readonly jevScore?: number;
	readonly inputTokens: number;
	readonly error?: string;
}

/** One graded case. */
export interface CaseOutcome {
	readonly name: string;
	readonly config: JevConfig;
	readonly runs: readonly RunOutcome[];
}

/** A whole grading pass. */
export interface Graded {
	readonly stampDir: string;
	readonly cases: readonly CaseOutcome[];
	/** Cases without a `jev.yaml`. */
	readonly skipped: readonly string[];
}

/** What a pass needs from its caller. */
export interface GradeOptions {
	readonly input: string;
	readonly key: string;
	readonly fetch?: Fetch | undefined;
	readonly sleep?: Sleep | undefined;
}

const write = (path: string, value: unknown): Promise<number> =>
	Bun.write(path, `${JSON.stringify(value, undefined, "\t")}\n`);

const gradeRun = async (
	options: GradeOptions,
	jevDir: string,
	record: CaseRecord,
	config: JevConfig,
	arm: Arm,
	index: number,
	run: RunRecord
): Promise<RunOutcome> => {
	const base = { arm, index, engineScore: run.score };
	const fail = (error: string): RunOutcome => ({
		...base,
		inputTokens: 0,
		error
	});
	const trace = await readReply(run.tracePath);
	if ("error" in trace) {
		return fail(trace.error);
	}
	const request = buildRequest(config, record.prompt, trace.reply);
	const file = join(jevDir, `${record.name}.${arm}.${index + 1}.json`);
	const response = await callJev(
		request,
		options.key,
		options.fetch,
		options.sleep
	);
	if (typeof response === "string") {
		await write(file, { request, error: response });
		return fail(response);
	}
	await write(file, { request, response: response.raw });
	return {
		...base,
		noul: response.noul,
		jevScore: runScore(config, response.noul),
		inputTokens: response.inputTokens
	};
};

/**
 * Grades the newest run's replies with Jev and logs each exact request and response.
 *
 * @param options The results input, API key and optional fetch and sleep stubs.
 * @returns Per-case, per-run outcomes; failures are errors on the run, never low scores.
 * @throws When no aggregate result exists or a `jev.yaml` breaks the schema.
 */
export async function gradeResults(options: GradeOptions): Promise<Graded> {
	const file = await findAggregate(options.input);
	if (file === undefined) {
		throw new Error(`no aggregate-result.json under ${options.input}`);
	}
	const aggregate = await readAggregate(file);
	const jevDir = join(aggregate.stampDir, "jev");
	const graded = await Promise.all(
		aggregate.cases.map(async (record): Promise<CaseOutcome | string> => {
			const config = await loadConfig(
				join(aggregate.pluginRoot, record.dir, "jev.yaml")
			);
			if (config === undefined) {
				return record.name;
			}
			const runs = await Promise.all(
				ARMS.flatMap((arm) =>
					record.arms[arm].map((run, index) =>
						gradeRun(options, jevDir, record, config, arm, index, run)
					)
				)
			);
			return { name: record.name, config, runs };
		})
	);
	return {
		stampDir: aggregate.stampDir,
		cases: graded.filter((one) => typeof one !== "string"),
		skipped: graded.filter((one) => typeof one === "string")
	};
}
