// Validation of one change: delta files against each other and against the main specs.
import { type Fs, join, nonEmpty, statOf } from "./fs.ts";
import { merge } from "./spec-merge.ts";
import { parsePlan } from "./spec-plan.ts";
import type { Plan } from "./spec-plan.ts";
import { at, type Issue, type Report, report } from "./spec-rules.ts";
import { type Doc, missingCheckboxes, numberingIssues } from "./tasks.ts";
import {
	baseBlocks,
	discoverDeltas,
	type Found,
	linkEscapes,
} from "./validate-discover.ts";
import { type Base, deltaIssues, type Loaded } from "./validate-issues.ts";
import { type Meta, metadata } from "./validate-meta.ts";

export const NO_DELTA = "Change must have at least one delta";

const KINDS = ["added", "modified", "removed", "renamed"] as const;

const tryBase = async (
	fs: Fs,
	mainSpecsDir: string,
	id: string,
): Promise<Base> => {
	try {
		return await baseBlocks(fs, mainSpecsDir, id);
	} catch {
		return "unreadable";
	}
};

const hasFileUnder = async (fs: Fs, dir: string): Promise<boolean> => {
	const info = await statOf(fs, dir);
	if (!info) {
		return false;
	}
	if (info.kind !== "dir") {
		return true;
	}
	const entries = await fs.list(dir);
	const hits = await Promise.all(
		entries.map((e) =>
			e.kind === "dir"
				? hasFileUnder(fs, join(dir, e.name))
				: Promise.resolve(!e.name.startsWith(".")),
		),
	);
	return hits.some(Boolean);
};

const load = async (
	fs: Fs,
	mainSpecsDir: string | undefined,
	d: Found,
): Promise<Loaded> => ({
	...d,
	plan: parsePlan(await fs.read(d.file)),
	base: nonEmpty(mainSpecsDir)
		? await tryBase(fs, mainSpecsDir, d.id)
		: undefined,
});

const countOf = (plan: Plan) =>
	plan.added.length +
	plan.modified.length +
	plan.removed.length +
	plan.renamed.length;
const sectionsOf = (plan: Plan) =>
	KINDS.filter((k) => plan.present[k]).map(
		(k) => `## ${k.toUpperCase()} Requirements`,
	);

// Same merge as archive, so what archive would refuse fails here (upstream reports INFO).
const refusalIssues = async (
	fs: Fs,
	deltas: Loaded[],
	reported: Set<string>,
	mainSpecsDir: string,
): Promise<Issue[]> => {
	const escapes = await Promise.all(
		deltas.map((d) => linkEscapes(fs, mainSpecsDir, d.id)),
	);
	if (escapes.some(Boolean)) {
		return [
			at(
				"specs",
				"INFO",
				"Could not check archive merge conflicts: a main spec link resolves outside the allowed directory",
			),
		];
	}
	return deltas.flatMap((d) =>
		reported.has(d.path) || d.base === "unreadable"
			? []
			: merge(d.base, d.plan).failures.map((f) =>
					at(d.path, "ERROR", `Archive would refuse this delta: ${f.message}`),
				),
	);
};

const zeroDeltaIssues = (meta: Meta, filled: boolean): Issue[] => {
	if (!meta.skip) {
		return [at("file", "ERROR", NO_DELTA)];
	}
	return filled
		? []
		: [at("file", "INFO", "skip_specs is set: zero deltas accepted")];
};

const metaIssues = async (
	fs: Fs,
	dir: string,
	empty: boolean,
): Promise<Issue[]> => {
	const meta = await metadata(fs, dir);
	const filled = meta.skip && (await hasFileUnder(fs, join(dir, "specs")));
	return [
		...(nonEmpty(meta.invalid)
			? [
					at(
						".openspec.yaml",
						"ERROR",
						`skip_specs is set but .openspec.yaml is not valid change metadata (${meta.invalid})`,
					),
				]
			: []),
		...(meta.unknown.length > 0
			? [
					at(
						".openspec.yaml",
						"WARNING",
						`Unrecognized key name(s) in .openspec.yaml: ${meta.unknown.join(", ")}`,
					),
				]
			: []),
		...(filled
			? [
					at(
						"file",
						"ERROR",
						"skip_specs is set but spec files exist under specs/.",
					),
				]
			: []),
		...(empty ? zeroDeltaIssues(meta, filled) : []),
	];
};

// Files under specs/ that no delta covers, and delta sections that parsed to no entry.
const leftoverIssues = (
	unread: { path: string; expected: string }[],
	stray: string[],
	hollow: Loaded[],
): Issue[] => [
	...unread.map((u) =>
		at(
			u.path,
			"ERROR",
			`Delta spec found at specs/${u.path}. Move its requirements into specs/${u.expected}.`,
		),
	),
	...stray.map((path) =>
		at(
			path,
			"ERROR",
			`specs/${path} is not merged: only specs/<capability>/spec.md is. Move or remove it.`,
		),
	),
	...hollow.map((d) => {
		const sections = sectionsOf(d.plan);
		return at(
			d.path,
			"ERROR",
			sections.length > 0
				? `Delta sections ${sections.join(", ")} were found, but no requirement entries parsed.`
				: "No delta sections found.",
		);
	}),
];

export const validateDir = async (
	fs: Fs,
	dir: string,
	mainSpecsDir: string | undefined,
	strict: boolean,
): Promise<Report> => {
	const specsDir = join(dir, "specs");
	const { found, unread, stray } = await discoverDeltas(fs, specsDir);
	const deltas = await Promise.all(found.map((d) => load(fs, mainSpecsDir, d)));
	const rootInfo = await statOf(fs, join(specsDir, "spec.md"));
	const rootSpec = rootInfo?.kind === "file";
	const issues = [
		...(rootSpec
			? [
					at(
						"spec.md",
						"ERROR",
						"Delta spec found at specs/spec.md. Delta specs must live under a capability path",
					),
				]
			: []),
		...deltas.flatMap((item) => deltaIssues(item)),
	];
	const hollow = deltas.filter((d) => countOf(d.plan) === 0);
	const reported = new Set([
		...issues.filter((i) => i.level === "ERROR").map((i) => i.path),
		...hollow.map((d) => d.path),
	]);
	const noDeltas = !deltas.some((d) => countOf(d.plan) > 0);
	return report(
		[
			...issues,
			...(nonEmpty(mainSpecsDir)
				? await refusalIssues(fs, deltas, reported, mainSpecsDir)
				: []),
			...leftoverIssues(unread, stray, hollow),
			...(await metaIssues(
				fs,
				dir,
				noDeltas && !rootSpec && unread.length === 0,
			)),
		],
		strict,
	);
};

export const changeDir = (root: string, name: string) =>
	join(root, "openspec", "changes", name);

// The delta check plus the tasks.md rules upstream reports as warnings.
export const validateChange = async (
	fs: Fs,
	root: string,
	name: string,
	strict: boolean,
): Promise<Report> => {
	const dir = changeDir(root, name);
	const deltas = await validateDir(
		fs,
		dir,
		join(root, "openspec", "specs"),
		strict,
	);
	const path = join(dir, "tasks.md");
	const docs: Doc[] = (await fs.exists(path))
		? [{ path: "tasks.md", content: await fs.read(path) }]
		: [];
	const warnings = [...missingCheckboxes(docs), ...numberingIssues(docs)].map(
		(i) => at(`${i.path}:${i.line}`, "WARNING", i.message),
	);
	return report([...deltas.issues, ...warnings], strict);
};

export const issueKey = (i: Issue) => `${i.level}|${i.path}`;
