const MAX_COST_FLAG = /^--max-cost-usd(?:=|$)/;

export interface Verdict {
	code: number;
	lines: string[];
}

export interface Arm {
	code: number;
	result: string | null;
}

export const withCostBound = (opts: string[]): string[] =>
	opts.some((o) => MAX_COST_FLAG.test(o))
		? opts
		: [...opts, "--max-cost-usd", "5"];

export const evalArgs = (
	plugin: string,
	opts: string[],
	json: string,
): string[] => [
	"plugin",
	"eval",
	plugin,
	"--no-publish",
	...withCostBound(opts),
	"--json",
	json,
];

export const armHeading = (arm: "A" | "B", folder: string): string =>
	`\n== Arm ${arm} (${folder})\n`;

const NOT_LOADED = new Set([
	"manifest_invalid",
	"disabled_by_default",
	"will_not_load",
]);

/** The arm that the run names: the folders that the plugin can be recorded under, and the model of `--model`, if any. */
export interface Expected {
	plugins: string[];
	model?: string;
}

interface Doc {
	partial?: unknown;
	suite?: {
		modelOverride?: unknown;
		plugins?: { name?: unknown; path?: unknown; problem?: unknown }[];
	};
	cases?: { aggregates?: { score?: unknown; scoreWithout?: unknown } }[];
}

const MAX_SCORE = 1;

/** The value of `--model` in `opts`, in either form, or `undefined`. */
export const modelOf = (opts: string[]): string | undefined => {
	const at = opts.findIndex((o) => o === "--model" || o.startsWith("--model="));
	if (at === -1) {
		return undefined;
	}
	return opts[at]?.startsWith("--model=")
		? opts[at]?.slice("--model=".length)
		: opts[at + 1];
};

/** Why the loaded plugin or the model served is not the arm that the run names, or null. */
const armMismatch = (doc: Doc, expected: Expected): string | null => {
	const plugins = doc.suite?.plugins ?? [];
	if (
		plugins.length > 0 &&
		!plugins.some((p) => expected.plugins.includes(String(p?.path)))
	) {
		return `the plugin of the arm (${expected.plugins[0]}) is not the loaded plugin (${plugins.map((p) => String(p?.path)).join(", ")})`;
	}
	const model = doc.suite?.modelOverride;
	return expected.model !== undefined && model !== expected.model
		? `the model served is ${String(model)}, and the arm names ${expected.model}`
		: null;
};

export const armProblem = (
	result: string | null,
	expected?: Expected,
): string | null => {
	if (result === null) {
		return "it wrote no result file";
	}
	let doc: Doc;
	try {
		doc = JSON.parse(result);
	} catch {
		return "its result file is not JSON";
	}
	if (doc === null || typeof doc !== "object") {
		return "its result file is not an object";
	}
	if (!Array.isArray(doc.cases) || doc.cases.length === 0) {
		return "its result has no case";
	}
	if (doc.cases.some((c) => !Number.isFinite(c?.aggregates?.score))) {
		return "a case in its result has no score";
	}
	if (doc.partial === true) {
		return "its run is partial";
	}
	const plugins = doc.suite?.plugins;
	if (Array.isArray(plugins)) {
		if (plugins.length === 0) {
			return "no plugin loaded";
		}
		const bad = plugins.find((p) => NOT_LOADED.has(String(p?.problem)));
		if (bad) {
			return `the plugin ${String(bad.name)} did not load (${String(bad.problem)})`;
		}
	}
	return expected ? armMismatch(doc, expected) : null;
};

export const baselineProblem = (result: string | null): string | null => {
	if (result === null) {
		return null;
	}
	const doc: Doc = JSON.parse(result);
	const cases = doc.cases ?? [];
	const scores = cases.map((c) => c.aggregates?.scoreWithout);
	if (!scores.every((s) => Number.isFinite(s))) {
		return "a case in its result has no baseline score";
	}
	if (scores.every((s) => typeof s === "number" && s >= MAX_SCORE)) {
		return "its baseline is at the maximum, so no gain can show and the case does not separate the arms";
	}
	return null;
};

/** The runs of each case in `result`, for the line of a verdict. */
const sampleSize = (result: string | null): string => {
	const doc: { cases?: { runsPerCase?: unknown }[] } = JSON.parse(
		result ?? "{}",
	);
	const runs = doc.cases?.map((c) => c.runsPerCase);
	return runs?.length ? runs.join(", ") : "unknown";
};

export const verdict = (
	x: Arm,
	y: Arm,
	expected?: [Expected, Expected],
): Verdict => {
	const failed = (
		[
			["A", x],
			["B", y],
		] as const
	).flatMap(([name, arm]) => {
		if (arm.code !== 0) {
			return [`Arm ${name} failed with exit code ${arm.code}.`];
		}
		const problem = armProblem(arm.result, expected?.[name === "A" ? 0 : 1]);
		if (problem) {
			return [`Arm ${name} has no valid result: ${problem}.`];
		}
		const base = baselineProblem(arm.result);
		return base ? [`Arm ${name} has no usable baseline: ${base}.`] : [];
	});
	if (failed.length === 0) {
		return {
			code: 0,
			lines: [
				`\nCompare the WITH column of the two tables. Runs of each case: ${sampleSize(x.result)} (arm A), ${sampleSize(y.result)} (arm B).`,
			],
		};
	}
	return {
		code: 1,
		lines: [
			`\n${failed.join("\n")}\nTell the user, and do not compare the tables.`,
		],
	};
};
