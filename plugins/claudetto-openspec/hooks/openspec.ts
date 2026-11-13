import type { Fs } from "./fs";
import { create, init } from "./layout";
import { checkSpec, mainSpecs, requirementCount } from "./main-specs";
import type { Report } from "./spec/spec-rules";
import { activeChanges, archivedChanges, progress } from "./status";
import {
	archived,
	archivedLine,
	badName,
	cutNote,
	issueLine,
	needsChange,
	NO_CHANGES,
	NO_OPENSPEC,
	NO_SPECS,
	noChange,
	NOTHING,
	openLine,
	refused,
	specLine,
	statusDetail,
	statusLine,
	verdict,
} from "./texts";
import { archive, type Run } from "./validate/archive";
import { ArchiveBlocked } from "./validate/archive-merge";
import { changeDir, validateChange } from "./validate/validate";

export type Call = Record<string, unknown>;
export interface Deps {
	fs: Fs;
	run: Run;
	root: string;
	date: string;
}

// A model-supplied value as text for a refusal or a name check; an object shows as JSON.
const shown = (value: unknown) =>
	typeof value === "string" ? value : (JSON.stringify(value) ?? "");

// The name becomes a path segment, so it is checked where the model's input enters.
const NAME = /^[\w][\w.-]*$/u;

const report = (name: string, r: Report) =>
	[
		verdict(name, r.valid, r.issues.length),
		...r.issues.map((i) => issueLine(i.level, i.path, i.message)),
	].join("\n");

const one = async (d: Deps, name: string) =>
	report(name, await validateChange(d.fs, d.root, name, true));

const status = async (d: Deps, names: string[], single: boolean) => {
	const all = await Promise.all(names.map((n) => progress(d.fs, d.root, n)));
	return names
		.flatMap((name, i) => {
			const p = all[i];
			if (!p) {
				return [];
			}
			const total = p.done + p.open.length;
			return [
				single
					? statusDetail(name, p.artifacts, p.done, total)
					: statusLine(name, p.done, total),
				...(single ? p.open.map((t) => openLine(t.line, t.text)) : []),
			];
		})
		.join("\n");
};

const archiveChange = async (d: Deps, change: string) => {
	try {
		return archived(change, await archive(d.fs, d.run, d.root, change, d.date));
	} catch (error) {
		if (error instanceof ArchiveBlocked) {
			return refused(change, error.message);
		}
		throw error;
	}
};

// Checks the optional change name; returns the refusal text, or the name (or none) when it is fine.
const checkedChange = async (d: Deps, change: unknown) => {
	if (change === undefined) {
		return { change };
	}
	if (typeof change !== "string" || !NAME.test(change)) {
		return { refusal: badName(shown(change)) };
	}
	if (!(await d.fs.exists(changeDir(d.root, change)))) {
		return { refusal: noChange(change) };
	}
	return { change };
};

const everything = async (d: Deps, names: string[]) => {
	const specs = await mainSpecs(d.fs, d.root);
	if (names.length + specs.length === 0) {
		return NOTHING;
	}
	const changes = await Promise.all(names.map((n) => one(d, n)));
	const checked = specs.map((s) => report(`specs/${s.id}`, checkSpec(s.md)));
	return [...changes, ...checked].join("\n");
};

const overview = async (d: Deps, names: string[]) => {
	const awaited = await archivedChanges(d.fs, d.root);
	const lines = [
		await status(d, names, false),
		...awaited.map((item) => archivedLine(item)),
	].filter(Boolean);
	return lines.length > 0 ? lines.join("\n") : NO_CHANGES;
};

const list = async (d: Deps) => {
	const specs = await mainSpecs(d.fs, d.root);
	return specs.length > 0
		? specs.map((s) => specLine(s.id, requirementCount(s.md))).join("\n")
		: NO_SPECS;
};

const openNew = (d: Deps, change: unknown) => {
	if (change === undefined) {
		return needsChange("new");
	}
	return create(d.fs, d.root, shown(change), d.date);
};

// About 3,000 tokens: far under the 10,000-token warning of Claude Code, and room for a long task list.
const MAX_CHARS = 12_000;

// Keeps whole lines up to the limit; a first line past the limit is cut by characters and its rest counts as a line.
const bounded = (text: string): string => {
	if (text.length <= MAX_CHARS) {
		return text;
	}
	const cut = text.slice(0, MAX_CHARS);
	const end = cut.lastIndexOf("\n");
	const kept = end > 0 ? cut.slice(0, end) : cut;
	const rest = text.slice(kept.length).replace(/^\n/u, "").trimEnd();
	return `${kept}\n${cutNote(rest.split("\n").length)}`;
};

export const openspec = async (d: Deps, call: Call): Promise<string> =>
	bounded(await act(d, call));

const act = async (d: Deps, call: Call): Promise<string> => {
	const action = call["action"] ?? "validate";
	if (action === "init") {
		return init(d.fs, d.root);
	}
	const names = await activeChanges(d.fs, d.root);
	if (!names) {
		return NO_OPENSPEC;
	}
	if (action === "new") {
		return openNew(d, call["change"]);
	}
	if (action === "list") {
		return list(d);
	}
	const checked = await checkedChange(d, call["change"]);
	if (checked.refusal !== undefined) {
		return checked.refusal;
	}
	const change = checked.change;
	if (action === "archive") {
		return change === undefined
			? needsChange("archive")
			: archiveChange(d, change);
	}
	if (action === "status") {
		return change === undefined
			? overview(d, names)
			: status(d, [change], true);
	}
	return change === undefined ? everything(d, names) : one(d, change);
};
