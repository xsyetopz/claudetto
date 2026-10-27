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
import { byCodeUnit, type Run } from "./shared.ts";

const PARITY = import.meta.dirname;

const NOTE_LINE = /^Note: Schema commands are experimental.*\n?/gm;
const CHANGES_BREAK = /(?<=changes:)\n/;
const AGO_SUFFIX = /\s+(just now|\d+[mhd] ago)$/;
const DATE_TEXT = /\d{4}-\d{2}-\d{2}(T[\d:.]+Z)?/g;

const exists = async (p: string): Promise<boolean> => {
	try {
		await access(p);
		return true;
	} catch {
		return false;
	}
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
