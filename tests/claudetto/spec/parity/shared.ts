// The shared facts of the two tools: the record of a run, the JSON readers, and the projection by command.
// See `main.test.ts` for the method.

const OPENSPEC_ONLY =
	/^(Proposal warnings|⚠|Next:|- (Creating|Generating|Validating))/;
const LIST_SUFFIX = /\s+(just now|\d+[mhd] ago|<ago>|[\d/.-]+)$/;
const DIFF_HEADER =
	/^(ADDED|REMOVED|RENAMED|MODIFIED):|^Specifications Changed/;

/** Orders strings by their code units, as `sort()` with no function does. */
export const byCodeUnit = (a: string, b: string): number => {
	if (a < b) {
		return -1;
	}
	return a > b ? 1 : 0;
};

/** What a command did on a fresh project. */
export interface Run {
	code: number;
	facts: unknown;
	written: { [file: string]: string };
	removed: string[];
}

export interface Obj {
	[k: string]: unknown;
}

const isObj = (x: unknown): x is Obj => typeof x === "object" && x !== null;

/** The JSON object `x`: a value of another kind is a failure of the test. */
export const obj = (x: unknown): Obj => {
	if (!isObj(x)) {
		throw new Error(`Expected a JSON object, got ${JSON.stringify(x)}`);
	}
	return x;
};

/** The JSON array `x`: a value of another kind is a failure of the test. */
export const list = (x: unknown): unknown[] => {
	if (!Array.isArray(x)) {
		throw new Error(`Expected a JSON array, got ${JSON.stringify(x)}`);
	}
	return x;
};

/** The field `k` of the JSON object `x`. */
export const field = (x: unknown, k: string): unknown => obj(x)[k];

const isLines = (x: unknown): x is string[] =>
	Array.isArray(x) && typeof x[0] === "string";

const pick = (o: Obj, keys: string[]): Obj =>
	Object.fromEntries(keys.map((k) => [k, o[k]]));

/** The lines of text, with the lines that only OpenSpec prints left out. */
const lines = (f: string[]): string[] =>
	f.filter((l) => !OPENSPEC_ONLY.test(l));

/** The shared facts of the JSON of each command, by the first argument. The text of a command is `lines`. */
type Shared = (f: unknown, tool: string) => unknown;

/** The shared facts of the JSON of `status` for one change. */
const applyRequires = (f: Obj, tool: string): unknown => {
	if (tool !== "minispec") {
		return field(f, "applyRequires");
	}
	const apply = field(f, "apply");
	return isObj(apply) ? field(apply, "requires") : undefined;
};

const shareStatus = (f: Obj, tool: string) => ({
	...pick(f, ["changeName", "schemaName", "isComplete"]),
	applyRequires: applyRequires(f, tool),
	artifacts: list(field(f, "artifacts")).map((a) =>
		pick(obj(a), ["id", "status", "requires", "outputPath", "missingDeps"]),
	),
});

const SHARED: { [command: string]: Shared } = {
	new: (f) =>
		pick(obj(field(f, "change")), ["id", "path", "metadataPath", "schema"]),
	list: (f) =>
		field(f, "specs") ??
		list(field(f, "changes")).map((c) =>
			pick(obj(c), [
				"name",
				"completedTasks",
				"totalTasks",
				"status",
				"archived",
			]),
		),
	status: (f, tool) =>
		field(f, "changes")
			? list(field(f, "changes")).map((c) => shareStatus(obj(c), tool))
			: shareStatus(obj(f), tool),
	validate: (f) => ({
		items: list(field(f, "items")).map((i) =>
			pick(obj(i), ["id", "valid", "issues"]),
		),
		totals: field(field(f, "summary"), "totals"),
	}),
	show: (f) =>
		pick(obj(f), [
			"id",
			"deltaCount",
			"deltas",
			"overview",
			"requirementCount",
			"requirements",
		]),
	// OpenSpec words the instruction of a blocked apply with the remedy, and lists the artifacts that follow.
	instructions: (f) => ({
		...obj(f),
		...(field(f, "contextFiles")
			? { instruction: undefined, missingPrerequisites: undefined }
			: {}),
		planningHome: undefined,
		root: undefined,
	}),
	schemas: (f) =>
		list(f)
			.filter((s) => field(s, "source") === "project")
			.map((s) => pick(obj(s), ["name", "description", "artifacts"])),
	schema: (f) =>
		list(field(f, "schemas") ?? [f])
			.map((r) => pick(obj(r), ["name", "path", "valid", "issues"]))
			.sort((a, b) => String(a["name"]).localeCompare(String(b["name"]))),
	archive: (f) =>
		pick(obj(field(f, "archive")), [
			"change",
			"archivedAs",
			"path",
			"specsUpdated",
			"totals",
			"openTasks",
		]),
};

/** `show --diff` text: the headers of the deltas, because OpenSpec prints a unified diff of a modified requirement. */
const diffHeaders = (f: string[]): string[] =>
	f.filter((l) => DIFF_HEADER.test(l));

/** The facts that the two tools share, for the command `command`. The other keys of the output stay out. */
export const project = (
	tool: "openspec" | "minispec",
	command: string,
	rec: Run,
	text: boolean,
): Run => {
	const f = rec.facts;
	const shared = (): unknown => {
		if (!isLines(f)) {
			return (SHARED[command] ?? ((x) => x))(f, tool);
		}
		if (command === "list") {
			return lines(f)
				.map((l) => l.replace(LIST_SUFFIX, ""))
				.toSorted(byCodeUnit);
		}
		return command === "show" && f.includes("Specifications Changed (diffs)")
			? diffHeaders(f.map((l) => l.trim()))
			: lines(f);
	};
	return { ...rec, facts: text ? shared() : null };
};
