import { archive, ArchiveBlocked, type Run } from "./archive.ts";
import type { Fs } from "./fs.ts";
import { create, init } from "./layout.ts";
import { checkSpec, mainSpecs, requirementCount } from "./main-specs.ts";
import type { Report } from "./spec-rules.ts";
import { activeChanges, archivedChanges, progress } from "./status.ts";
import {
	archived,
	archivedLine,
	badName,
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
} from "./texts.ts";
import { changeDir, validateChange } from "./validate.ts";

export type Call = Record<string, unknown>;
export interface Deps {
	fs: Fs;
	run: Run;
	root: string;
	date: string;
}

// The name becomes a path segment, so it is checked where the model's input enters.
const NAME = /^[\w][\w.-]*$/;

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
	} catch (e) {
		if (e instanceof ArchiveBlocked) {
			return refused(change, e.message);
		}
		throw e;
	}
};

// Checks the optional change name; returns the refusal text, or the name (or none) when it is fine.
const checkedChange = async (d: Deps, change: unknown) => {
	if (change === undefined) {
		return { change };
	}
	if (typeof change !== "string" || !NAME.test(change)) {
		return { refusal: badName(String(change)) };
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
	const lines = [
		await status(d, names, false),
		...(await archivedChanges(d.fs, d.root)).map(archivedLine),
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
	return create(d.fs, d.root, String(change), d.date);
};

export const openspec = async (d: Deps, call: Call): Promise<string> => {
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
			: await archiveChange(d, change);
	}
	if (action === "status") {
		return change === undefined
			? overview(d, names)
			: status(d, [change], true);
	}
	return change === undefined ? everything(d, names) : one(d, change);
};
