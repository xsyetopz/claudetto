import { cp, mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Fetch } from "../jev-grade/client";
import { isRecord } from "../measure-tools/measure";

const HERE = import.meta.dir;
export const QUESTION_IDS = [
	"says_failed",
	"avoids_pass_claim",
	"cites_evidence",
	"reports_changelog"
] as const;

/** A temp plugin with the shipped `jev.yaml`, the sample aggregate and a trimmed trace. */
export interface Tree {
	readonly results: string;
	readonly stampDir: string;
	readonly aggregate: string;
	readonly trace: string;
}

/**
 * Builds `<plugin>/evals/results/<stamp>/aggregate-result.json` from the sample aggregate.
 *
 * @param missingTrace How many runs point at a trace that does not exist.
 * @returns The paths of the tree.
 */
export async function makeTree(missingTrace = 0): Promise<Tree> {
	const root = await mkdtemp(join(tmpdir(), "jev-grade-"));
	const plugin = join(root, "plugins", "p");
	const stampDir = join(plugin, "evals", "results", "2026-11-21");
	const caseDir = join(plugin, "evals", "background-check-fails");
	await mkdir(stampDir, { recursive: true });
	await mkdir(caseDir, { recursive: true });
	await cp(
		join(HERE, "../../plugins/claudetto/evals/background-check-fails/jev.yaml"),
		join(caseDir, "jev.yaml")
	);
	const trace = join(root, "trace.jsonl");
	await cp(join(HERE, "fixtures/eval-trace.jsonl"), trace);
	const aggregate: unknown = await Bun.file(
		join(HERE, "fixtures/eval-aggregate.json")
	).json();
	const cases =
		isRecord(aggregate) && Array.isArray(aggregate["cases"])
			? aggregate["cases"]
			: [];
	const runs = cases.flatMap((one: unknown): unknown[] =>
		isRecord(one) && isRecord(one["arms"])
			? Object.values(one["arms"]).flat()
			: []
	);
	let missing = missingTrace;
	for (const run of runs) {
		if (isRecord(run)) {
			run["tracePath"] = missing-- > 0 ? join(root, "gone.jsonl") : trace;
		}
	}
	const file = join(stampDir, "aggregate-result.json");
	await Bun.write(file, JSON.stringify(aggregate));
	return {
		results: join(plugin, "evals", "results"),
		stampDir,
		aggregate: file,
		trace
	};
}

/** The calls a stubbed fetch received. */
export interface Calls {
	urls: string[];
	headers: Headers[];
	bodies: unknown[];
}

/**
 * A stub of Jev's endpoint.
 *
 * @param noul The probability returned for every question.
 * @param status The HTTP status to answer with.
 * @returns The fetch and what it saw.
 */
export function stubFetch(
	noul: number | ((id: string) => number),
	status = 200
): { fetch: Fetch; calls: Calls } {
	const calls: Calls = { urls: [], headers: [], bodies: [] };
	const fetchStub: Fetch = (url, init) => {
		calls.urls.push(url);
		calls.headers.push(new Headers(init.headers));
		const body: unknown = JSON.parse(
			typeof init.body === "string" ? init.body : "{}"
		);
		calls.bodies.push(body);
		const ids =
			isRecord(body) && isRecord(body["questions"])
				? Object.keys(body["questions"])
				: [];
		if (status !== 200) {
			return Promise.resolve(new Response("boom", { status }));
		}
		const answers = Object.fromEntries(
			ids.map((id) => [
				id,
				{ type: "noul", noul: typeof noul === "number" ? noul : noul(id) }
			])
		);
		return Promise.resolve(
			Response.json({
				model: "jev-1.14.0",
				answers,
				usage: { input_tokens: 1000, output_tokens: 4 }
			})
		);
	};
	return { fetch: fetchStub, calls };
}
