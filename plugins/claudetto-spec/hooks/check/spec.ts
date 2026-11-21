import { type CitedUnasserted, citedUnasserted } from "./citations";
import { driftOf, type RemovedId, type Reworded } from "./drift";
import {
	type Inflated,
	type Malformed,
	parseSpec,
	type Requirement
} from "./parse";
import { citedIds, isSpecFile, isTestFile, listPaths } from "./paths";
import { type Tampered, tamperedTests } from "./tamper";

export { parseSpec } from "./parse";
export type { Inflated, Malformed, Requirement } from "./parse";

/** What `spec_check` reports. */
export interface Report {
	requirements: Requirement[];
	malformed: Malformed[];
	inflated: Inflated[];
	uncovered: string[];
	orphans: string[];
	/** IDs HEAD's spec files define that no spec file defines now. */
	removedIds: RemovedId[];
	/** IDs whose one behaviour sentence differs from HEAD's. */
	reworded: Reworded[];
	/** Test files edited since they were staged. */
	changedSinceStaged: string[];
	/** Per staged test file: deleted, new skip/only markers, dropped assertions. */
	tampered: Tampered[];
	/** Test blocks that cite a known ID and call no assertion (a heuristic, see `citedUnasserted`). */
	citedUnasserted: CitedUnasserted[];
}

/** The files and git outputs one check reads. */
export interface CheckInput {
	/** `git ls-files --cached --others --exclude-standard` output. */
	listing: string;
	/** `git diff --name-only` output (work tree against the index). */
	diff: string;
	/** HEAD's text (`git show HEAD:<file>`) by spec path; a path without an entry is new. */
	head?: ReadonlyMap<string, string> | undefined;
	/** `git diff --name-only --diff-filter=D` output: files the work tree lost since staging. */
	deleted?: string | undefined;
	/** Index text (`git show :<file>`) by path, for the test files `diff` names. */
	index?: ReadonlyMap<string, string> | undefined;
	/** File text by path, for the spec and test files `listing` names. */
	texts: ReadonlyMap<string, string>;
	/** Limits the report to one spec file. */
	path?: string | undefined;
}

function prefixOf(id: string): string {
	return id.replace(/-\d+$/u, "");
}

/** Malformed entries for each ID a later file or line defines again. */
function duplicates(requirements: Requirement[]): Malformed[] {
	const seen = new Map<string, Requirement>();
	const found: Malformed[] = [];
	for (const requirement of requirements) {
		const first = seen.get(requirement.id);
		if (first === undefined) {
			seen.set(requirement.id, requirement);
		} else {
			found.push({
				file: requirement.file,
				line: requirement.line,
				reason: `duplicate ID ${requirement.id}, first defined at ${first.file}:${first.line}`
			});
		}
	}
	return found;
}

interface SpecScan {
	requirements: Requirement[];
	malformed: Malformed[];
	inflated: Inflated[];
	removedIds: RemovedId[];
	reworded: Reworded[];
}

/** Parses every spec file in `paths` and compares it with HEAD's version. */
function scanSpecs(paths: string[], input: CheckInput): SpecScan {
	const found: SpecScan = {
		requirements: [],
		malformed: [],
		inflated: [],
		removedIds: [],
		reworded: []
	};
	const now = {
		behaviours: new Map<string, string>(),
		lines: new Map<string, number>(),
		files: new Map<string, string>()
	};
	for (const file of paths.filter((p) => isSpecFile(p)).toSorted()) {
		const parsed = parseSpec(file, input.texts.get(file) ?? "");
		found.requirements.push(...parsed.requirements);
		found.malformed.push(...parsed.malformed);
		found.inflated.push(...parsed.inflated);
		for (const r of parsed.requirements) {
			if (!now.files.has(r.id)) {
				now.files.set(r.id, file);
				now.lines.set(r.id, r.line);
				now.behaviours.set(r.id, parsed.behaviours.get(r.id) ?? "");
			}
		}
	}
	for (const [file, text] of input.head ?? []) {
		if (paths.includes(file)) {
			const drift = driftOf(file, parseSpec(file, text).behaviours, now);
			found.removedIds.push(...drift.removedIds);
			found.reworded.push(...drift.reworded);
		}
	}
	found.malformed.push(...duplicates(found.requirements));
	return found;
}

/** Parses the specs, reads the citations in the tests, and lists what the git outputs say changed. */
export function checkSpecs(input: CheckInput): Report {
	const paths = listPaths(input.listing);
	const specs = scanSpecs(paths, input);
	const cited = new Set<string>();
	for (const file of paths.filter((p) => isTestFile(p) && !isSpecFile(p))) {
		for (const id of citedIds(input.texts.get(file) ?? "")) {
			cited.add(id);
		}
	}
	const known = new Set(specs.requirements.map((r) => r.id));
	const scope = (file: string): boolean =>
		input.path === undefined || file === input.path;
	const scoped = specs.requirements.filter((r) => scope(r.file));
	// With a path, only the prefixes of that spec count; known IDs come from every spec.
	const prefixes = new Set(
		(input.path === undefined ? specs.requirements : scoped).map((r) =>
			prefixOf(r.id)
		)
	);
	const scopedIds = new Set(scoped.map((r) => r.id));
	return {
		requirements: scoped,
		malformed: specs.malformed.filter((m) => scope(m.file)),
		inflated: specs.inflated.filter((i) => scope(i.file)),
		uncovered: scoped.map((r) => r.id).filter((id) => !cited.has(id)),
		orphans: [...cited]
			.filter((id) => !known.has(id) && prefixes.has(prefixOf(id)))
			.toSorted(),
		removedIds: specs.removedIds.filter((d) => scope(d.file)),
		reworded: specs.reworded.filter((d) => scope(d.file)),
		changedSinceStaged: listPaths(input.diff).filter((p) => isTestFile(p)),
		citedUnasserted: paths
			.filter((p) => isTestFile(p) && !isSpecFile(p))
			.flatMap((p) => citedUnasserted(p, input.texts.get(p) ?? "", scopedIds)),
		tampered: tamperedTests(
			input.diff,
			input.deleted ?? "",
			input.index ?? new Map(),
			input.texts
		)
	};
}
