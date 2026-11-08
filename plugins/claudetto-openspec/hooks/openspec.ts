import { ArchiveBlocked, archive, type Run } from "./archive.ts";
import type { Fs } from "./fs.ts";
import { activeChanges, progress } from "./status.ts";
import {
	archived,
	badName,
	issueLine,
	NEEDS_CHANGE,
	NO_CHANGES,
	NO_OPENSPEC,
	noChange,
	openLine,
	refused,
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

const one = async (d: Deps, name: string) => {
	const report = await validateChange(d.fs, d.root, name, true);
	return [
		verdict(name, report.valid, report.issues.length),
		...report.issues.map((i) => issueLine(i.level, i.path, i.message)),
	].join("\n");
};

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

export const openspec = async (d: Deps, call: Call): Promise<string> => {
	const names = await activeChanges(d.fs, d.root);
	if (!names) {
		return NO_OPENSPEC;
	}
	const action = call["action"] ?? "validate";
	const checked = await checkedChange(d, call["change"]);
	if (checked.refusal !== undefined) {
		return checked.refusal;
	}
	const change = checked.change;
	if (action === "archive") {
		return change === undefined ? NEEDS_CHANGE : await archiveChange(d, change);
	}
	const chosen = change === undefined ? names : [change];
	if (chosen.length === 0) {
		return NO_CHANGES;
	}
	if (action === "status") {
		return status(d, chosen, change !== undefined);
	}
	return (await Promise.all(chosen.map((n) => one(d, n)))).join("\n");
};
