// The helpers of the parity test: run a command of `openspec` or `minispec` on a fresh project, and keep the facts that both tools share.
// See `main.test.ts` for the method.

import { access, cp, readdir, realpath, stat, utimes } from "node:fs/promises";
import path from "node:path";
import { file as bunFile } from "bun";
import { eachInOrder } from "../../../../tools/ordered.ts";
import {
	type openspec,
	sampleProject,
	tmpEmpty,
} from "../../../support/openspec.ts";

const PARITY = import.meta.dirname;

const NOTE_LINE = /^Note: Schema commands are experimental.*\n?/gm;
const CHANGES_BREAK = /(?<=changes:)\n/;
const AGO_SUFFIX = /\s+(just now|\d+[mhd] ago)$/;
const DATE_TEXT = /\d{4}-\d{2}-\d{2}(T[\d:.]+Z)?/g;
const OPENSPEC_ONLY =
	/^(Proposal warnings|⚠|Next:|- (Creating|Generating|Validating))/;
const LIST_SUFFIX = /\s+(just now|\d+[mhd] ago|<ago>|[\d/.-]+)$/;
const DIFF_HEADER =
	/^(ADDED|REMOVED|RENAMED|MODIFIED):|^Specifications Changed/;

const exists = async (p: string): Promise<boolean> => {
	try {
		await access(p);
		return true;
	} catch {
		return false;
	}
};

/** Orders strings by their code units, as `sort()` with no function does. */
const byCodeUnit = (a: string, b: string): number => {
	if (a < b) {
		return -1;
	}
	return a > b ? 1 : 0;
};

/** The project of a case: the samples, `bad-scenario`, and each overlay of `parity/overlays/`, or an empty folder. */
const projectFor = async (
	empty: boolean,
	overlays: string[],
): Promise<string> => {
	if (empty) {
		return tmpEmpty("parity-empty");
	}
	const root = await sampleProject(["story", "task", "epic"]);
	await cp(
		path.join(PARITY, "bad-scenario"),
		path.join(root, "openspec/changes/bad-scenario"),
		{ recursive: true },
	);
	// Each overlay lands on the files of the one before, so the copies keep their order.
	await eachInOrder(overlays, async (overlay) => {
		await cp(path.join(PARITY, "overlays", overlay), root, {
			recursive: true,
		});
	});
	await dateChanges(root);
	return root;
};

/**
 * Gives each change a time of its own, one minute apart, in name order.
 * The copies keep the times of the files in the repository, and `list` of OpenSpec prints and sorts by those times ("just now" or "16h ago", by the day of the checkout).
 */
const dateChanges = async (root: string): Promise<void> => {
	const changes = path.join(root, "openspec/changes");
	if (!(await exists(changes))) {
		return;
	}
	const groups = await Promise.all(
		["", "archive"].map(async (parent) => {
			if (!(await exists(path.join(changes, parent)))) {
				return [];
			}
			const entries = await readdir(path.join(changes, parent), {
				withFileTypes: true,
			});
			return entries
				.filter((e) => e.isDirectory() && e.name !== "archive")
				.map((e) => path.join(parent, e.name));
		}),
	);
	const dirs = groups.flat();
	dirs.sort();
	const now = Date.now();
	await Promise.all(
		dirs.map(async (dir, i) => {
			const when = new Date(now - (i + 1) * 60_000);
			const top = path.join(changes, dir);
			await utimes(top, when, when);
			const inner = await readdir(top, { recursive: true });
			await Promise.all(
				inner.map((f) => utimes(path.join(top, f), when, when)),
			);
		}),
	);
};

/** The text of each file under `root`, by its path from `root`. */
const files = async (root: string): Promise<{ [file: string]: string }> => {
	const names = await readdir(root, { recursive: true });
	const kinds = await Promise.all(
		names.map(async (f) => ({
			f,
			isFile: (await stat(path.join(root, f))).isFile(),
		})),
	);
	const sorted = kinds
		.filter((k) => k.isFile)
		.map((k) => k.f)
		.sort(byCodeUnit);
	return Object.fromEntries(
		await Promise.all(
			sorted.map(async (f) => [f, await bunFile(path.join(root, f)).text()]),
		),
	);
};

/** `text` with the project folder as `<root>` and each date as `<date>`. */
const stable = async (text: string, root: string): Promise<string> =>
	text
		.replaceAll(await realpath(root), "<root>")
		.replaceAll(root, "<root>")
		.replace(DATE_TEXT, "<date>");

interface Named {
	name?: string;
	changeName?: string;
}

/**
 * The printed facts: the JSON with no run time, or the lines of text.
 * The changes of `list` are in name order, because OpenSpec sorts them by the time of the copies of the test.
 * The changes that a `message` lists are in name order, because OpenSpec gives them in the order of the file system.
 * The `schemas` of `schema validate` are in name order, because OpenSpec gives them in the order of the file system (`readdirSync` in `dist/commands/schema.js`).
 * The age in a line of `list` is `<ago>`, because it is the time since the run.
 */
const facts = (printed: string): unknown => {
	// OpenSpec ends each `schema` command with a note on stderr.
	const out = printed.replace(NOTE_LINE, "");
	try {
		return JSON.parse(out, (key, value) => {
			if (key === "durationMs") {
				return;
			}
			if (key === "message") {
				const [head, list] = value.split(CHANGES_BREAK);
				return list === undefined
					? value
					: `${head}\n${list.split("\n").toSorted().join("\n")}`;
			}
			if (key === "schemas" && Array.isArray(value)) {
				return value.toSorted((a, b) => a.name.localeCompare(b.name));
			}
			if (key !== "changes") {
				return value;
			}
			const nameOf = (c: Named) => c.name ?? c.changeName ?? "";
			return value.toSorted((a: Named, b: Named) =>
				nameOf(a).localeCompare(nameOf(b)),
			);
		});
	} catch {
		return out
			.split("\n")
			.map((l) => l.trim().replace(AGO_SUFFIX, " <ago>"))
			.filter(Boolean);
	}
};

/** What a command did on a fresh project. */
export interface Run {
	code: number;
	facts: unknown;
	written: { [file: string]: string };
	removed: string[];
}

/** Runs `args` with `tool` on a fresh project, and gives its record. */
export const record = async (
	tool: typeof openspec,
	args: string[],
	empty = false,
	overlays: string[] = [],
): Promise<Run> => {
	const root = await projectFor(empty, overlays);
	const before = await files(root);
	const { code, out } = await tool(root, args);
	const after = await files(root);
	const written = Object.fromEntries(
		Object.entries(after).filter(([f, text]) => before[f] !== text),
	);
	const removed = Object.keys(before).filter((f) => !(f in after));
	return JSON.parse(
		await stable(
			JSON.stringify({ code, facts: facts(out), written, removed }),
			root,
		),
	);
};

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
