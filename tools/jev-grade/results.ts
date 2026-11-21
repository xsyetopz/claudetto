import { readdir } from "node:fs/promises";
import { dirname, join } from "node:path";

import { isRecord } from "../measure-tools/measure";

/** One eval run, as `aggregate-result.json` records it. */
export interface RunRecord {
	readonly score: number | undefined;
	readonly tracePath: string | undefined;
}

/** One eval case with its runs per arm. */
export interface CaseRecord {
	readonly name: string;
	readonly dir: string;
	readonly prompt: string;
	readonly arms: Readonly<Record<"with" | "without", readonly RunRecord[]>>;
}

/** A results stamp directory, read. */
export interface Aggregate {
	/** The `<plugin>/evals/results/<stamp>` directory. */
	readonly stampDir: string;
	/** The plugin root, three levels above the stamp directory's file. */
	readonly pluginRoot: string;
	readonly cases: readonly CaseRecord[];
}

const AGGREGATE = "aggregate-result.json";

const exists = (path: string): Promise<boolean> => Bun.file(path).exists();

/**
 * Finds the aggregate file: the path itself, its own `aggregate-result.json`, or the newest
 * stamp directory beneath it (stamps sort by name).
 *
 * @param input A results directory, a stamp directory, or an aggregate file.
 * @returns The aggregate file's path, or `undefined` when none exists.
 */
export async function findAggregate(
	input: string
): Promise<string | undefined> {
	if (input.endsWith(".json") && (await exists(input))) {
		return input;
	}
	if (await exists(join(input, AGGREGATE))) {
		return join(input, AGGREGATE);
	}
	const entries = await readdir(input, { withFileTypes: true }).catch(() => []);
	const stamps = entries
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.toSorted()
		.toReversed();
	const present = await Promise.all(
		stamps.map((stamp) => exists(join(input, stamp, AGGREGATE)))
	);
	const newest = stamps.find((_stamp, index) => present[index] === true);
	return newest === undefined ? undefined : join(input, newest, AGGREGATE);
}

const parseRun = (value: unknown): RunRecord => {
	const run = isRecord(value) ? value : {};
	return {
		score: typeof run["score"] === "number" ? run["score"] : undefined,
		tracePath:
			typeof run["tracePath"] === "string" ? run["tracePath"] : undefined
	};
};

const parseArm = (arms: unknown, arm: string): RunRecord[] => {
	const runs = isRecord(arms) ? arms[arm] : undefined;
	return Array.isArray(runs) ? runs.map((run: unknown) => parseRun(run)) : [];
};

/**
 * Reads an aggregate file.
 *
 * @param file The `aggregate-result.json` path, inside `<plugin>/evals/results/<stamp>/`.
 * @returns The cases with their runs.
 * @throws When the file is not an aggregate result.
 */
export async function readAggregate(file: string): Promise<Aggregate> {
	const raw: unknown = await Bun.file(file).json();
	if (!isRecord(raw) || !Array.isArray(raw["cases"])) {
		throw new Error(`${file} is not an aggregate result: no cases`);
	}
	const cases = raw["cases"].flatMap((item: unknown): CaseRecord[] => {
		if (!isRecord(item) || typeof item["name"] !== "string") {
			return [];
		}
		return [
			{
				name: item["name"],
				dir: typeof item["dir"] === "string" ? item["dir"] : item["name"],
				prompt:
					typeof item["promptMarkdown"] === "string"
						? item["promptMarkdown"]
						: "",
				arms: {
					with: parseArm(item["arms"], "with"),
					without: parseArm(item["arms"], "without")
				}
			}
		];
	});
	const stampDir = dirname(file);
	return {
		stampDir,
		pluginRoot: dirname(dirname(dirname(stampDir))),
		cases
	};
}

/**
 * Reads a run's final reply from its trace: the `result` row's `result` text.
 *
 * @param tracePath The trace JSONL path, when the run kept one.
 * @returns The reply, or an error message naming what is missing.
 */
export async function readReply(
	tracePath: string | undefined
): Promise<{ reply: string } | { error: string }> {
	if (tracePath === undefined) {
		return { error: "no tracePath (run the eval with --keep-temp)" };
	}
	const file = Bun.file(tracePath);
	if (!(await file.exists())) {
		return { error: `trace missing: ${tracePath}` };
	}
	const text = await file.text();
	for (const line of text.split("\n").toReversed()) {
		if (line.trim() === "") {
			continue;
		}
		try {
			const row: unknown = JSON.parse(line);
			if (
				isRecord(row) &&
				row["type"] === "result" &&
				typeof row["result"] === "string"
			) {
				return { reply: row["result"] };
			}
		} catch {
			// A torn line is skipped; the result row is what matters.
		}
	}
	return { error: `trace has no result row: ${tracePath}` };
}
