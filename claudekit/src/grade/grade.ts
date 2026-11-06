import { isRecord } from "../shared/record.ts";

export interface Verdict {
	pass: boolean;
	label: string;
	evidence: string;
}

export interface Grader<I> {
	name: string;
	grade(input: I): Verdict | Promise<Verdict>;
	fixtures: { good: I[]; bad: I[] };
}

export interface SyncGrader<I> extends Grader<I> {
	grade(input: I): Verdict;
}

export interface FixtureReport {
	name: string;
	ok: boolean;
	reason?: string;
	failures: { kind: "good" | "bad"; input: unknown; verdict: Verdict }[];
}

export interface Example {
	text: string;
	label: string;
}

const PASS = "ok";
const EMPHASIS = /\*\*|__/g;

export const checkGrader = async <I>(g: Grader<I>): Promise<FixtureReport> => {
	if (g.fixtures.good.length === 0 || g.fixtures.bad.length === 0) {
		return { name: g.name, ok: false, reason: "needs at least one good and one bad fixture", failures: [] };
	}
	const failures: FixtureReport["failures"] = [];
	for (const [kind, inputs] of [
		["good", g.fixtures.good],
		["bad", g.fixtures.bad],
	] as const) {
		for (const input of inputs) {
			const verdict = await g.grade(input);
			if (verdict.pass !== (kind === "good")) {
				failures.push({ kind, input, verdict });
			}
		}
	}
	return { name: g.name, ok: failures.length === 0, failures };
};

// The first class in insertion order wins, so a reply that both agrees and apologizes gets one label.
export const textGrader = (spec: {
	name: string;
	classes: Record<string, RegExp[]>;
	examples: Example[];
}): SyncGrader<string> => {
	const grade = (text: string): Verdict => {
		const plain = text.replace(EMPHASIS, "");
		for (const [label, patterns] of Object.entries(spec.classes)) {
			const hit = patterns.find((p) => p.test(plain));
			if (hit) {
				return { pass: false, label, evidence: `${hit} matched ${JSON.stringify(text)}` };
			}
		}
		return { pass: true, label: PASS, evidence: `no class matched ${JSON.stringify(text)}` };
	};
	const missed = spec.examples.filter((e) => grade(e.text).label !== e.label);
	if (missed.length > 0) {
		const list = missed.map((e) => `${JSON.stringify(e.text)} want ${e.label} got ${grade(e.text).label}`);
		throw new Error(`${spec.name}: ${missed.length} labeled examples missed: ${list.join("; ")}`);
	}
	return {
		name: spec.name,
		grade,
		fixtures: {
			good: spec.examples.filter((e) => e.label === PASS).map((e) => e.text),
			bad: spec.examples.filter((e) => e.label !== PASS).map((e) => e.text),
		},
	};
};

export interface Check {
	path: string;
	equals?: unknown;
	count?: [number, number];
	bytes?: [number, number];
}

export const valueAt = (input: unknown, path: string): unknown =>
	path
		.split(".")
		.reduce<unknown>(
			(v, key) => (Array.isArray(v) ? v[Number(key)] : isRecord(v) ? v[key] : undefined),
			input,
		);

const inRange = (n: number, [min, max]: [number, number]): boolean => n >= min && n <= max;

const failedCheck = (input: unknown, c: Check): string | undefined => {
	const v = valueAt(input, c.path);
	if ("equals" in c && !Bun.deepEquals(v, c.equals)) {
		return `${c.path}: want ${JSON.stringify(c.equals)} got ${JSON.stringify(v)}`;
	}
	if (c.count) {
		const n = Array.isArray(v) ? v.length : -1;
		if (!inRange(n, c.count)) {
			return `${c.path}: want count in [${c.count.join(", ")}] got ${Array.isArray(v) ? n : typeof v}`;
		}
	}
	if (c.bytes) {
		const n = typeof v === "string" ? Buffer.byteLength(v) : -1;
		if (!inRange(n, c.bytes)) {
			return `${c.path}: want bytes in [${c.bytes.join(", ")}] got ${typeof v === "string" ? n : typeof v}`;
		}
	}
	return undefined;
};

export const structural = (spec: {
	name: string;
	checks: Check[];
	fixtures: { good: unknown[]; bad: unknown[] };
}): SyncGrader<unknown> => ({
	name: spec.name,
	fixtures: spec.fixtures,
	grade: (input) => {
		const failed = spec.checks.map((c) => failedCheck(input, c)).filter((f) => f !== undefined);
		return failed.length === 0
			? { pass: true, label: PASS, evidence: `${spec.checks.length} checks held` }
			: { pass: false, label: "fail", evidence: failed.join("; ") };
	},
});

// The file maps case ids to labels a person gave: { "labels": { "<id>": "<label>" } }; "ok" passes.
export const humanLabeled = async (path: string): Promise<SyncGrader<string>> => {
	const parsed: unknown = await Bun.file(path).json();
	const labels = isRecord(parsed) && isRecord(parsed.labels) ? parsed.labels : undefined;
	if (!labels || Object.values(labels).some((l) => typeof l !== "string")) {
		throw new Error(`labels must map case ids to strings: ${path}`);
	}
	const ids = Object.keys(labels);
	return {
		name: `human:${path}`,
		fixtures: {
			good: ids.filter((id) => labels[id] === PASS),
			bad: ids.filter((id) => labels[id] !== PASS),
		},
		grade: (id) => {
			const label = labels[id];
			if (typeof label !== "string") {
				throw new Error(`no human label for case ${id}`);
			}
			return { pass: label === PASS, label, evidence: `labeled ${label} by hand` };
		},
	};
};

// A reply that is not exactly one of the labels is "unparsed" and fails, so a chatty judge cannot pass a case.
export const judge = (spec: {
	name: string;
	labels: string[];
	prompt: (text: string) => string;
	call: (prompt: string) => Promise<string>;
	examples: Example[];
}): Grader<string> => ({
	name: spec.name,
	fixtures: {
		good: spec.examples.filter((e) => e.label === PASS).map((e) => e.text),
		bad: spec.examples.filter((e) => e.label !== PASS).map((e) => e.text),
	},
	grade: async (text) => {
		const answer = (await spec.call(spec.prompt(text))).trim();
		const label = spec.labels.includes(answer) ? answer : "unparsed";
		return { pass: label === PASS, label, evidence: `judge answered ${JSON.stringify(answer)}` };
	},
});

export interface Agreement {
	n: number;
	agree: number;
	rate: number;
	kappa: number;
}

// Cohen's kappa over the case ids both sides labeled.
export const agreement = (a: Record<string, string>, b: Record<string, string>): Agreement => {
	const ids = Object.keys(a).filter((id) => id in b);
	const n = ids.length;
	if (n === 0) {
		throw new Error("no case id is labeled by both sides");
	}
	const agree = ids.filter((id) => a[id] === b[id]).length;
	const share = (side: Record<string, string>, label: string) =>
		ids.filter((id) => side[id] === label).length / n;
	const labels = new Set(ids.flatMap((id) => [a[id], b[id]]));
	const chance = [...labels].reduce((sum, l) => sum + share(a, l ?? "") * share(b, l ?? ""), 0);
	const rate = agree / n;
	return { n, agree, rate, kappa: chance === 1 ? 1 : (rate - chance) / (1 - chance) };
};
