// Bun-only helpers for fixtures.spec.ts: the ported upstream records and their trees on disk.
import { mkdir, readdir, readFile, symlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { tempDir } from "../../tools/temp.mock.ts";
import { isObject, items } from "./fixture-shape.ts";

export { nodeFs } from "../../tools/node-fs.ts";

export const FILES = [
	"task-checkboxes",
	"task-numbering",
	"archive",
	"misplaced-delta-files",
	"validation",
	"validation.archive-preflight",
	"validation.enriched-messages",
	"validation.purpose-placeholder",
	"validation.scenario-body-parity",
	"validation.scenario-loss",
	"validation.scenario-steps",
	"validation.skip-specs",
	"validation.unknown-metadata-keys",
	"specs-apply.comment-masking.security",
	"specs-apply.fence-preservation",
	"specs-apply.line-endings",
	"specs-apply.project-linked-spec",
	"specs-apply.requirement-name-near-miss",
	"specs-apply.salvage",
	"specs-apply.security",
	"specs-apply.serialization",
	"specs-apply.symlink-escape.security",
];

export interface Entry {
	text?: string;
	link?: string;
	dir?: boolean;
}
export interface Rec {
	file: string;
	test: string;
	seq: number;
	kind: string;
	args: unknown;
	before: Record<string, Entry> | null;
	after: Record<string, Entry> | null;
	outcome: {
		returned?: unknown;
		threw?: { error: string; code: string | null };
	};
}

const isRec = (v: unknown): v is Rec =>
	isObject(v) &&
	typeof v["kind"] === "string" &&
	typeof v["test"] === "string" &&
	isObject(v["outcome"]);

export const load = async (name: string): Promise<Rec[]> => {
	const text = await readFile(
		`${import.meta.dir}/fixtures/${name}.json`,
		"utf8",
	);
	const parsed: unknown = JSON.parse(text);
	const records = items(parsed).filter((v): v is Rec => isRec(v));
	if (records.length !== items(parsed).length) {
		throw new TypeError(`fixtures/${name}.json holds a malformed record`);
	}
	return records;
};

const sub = (value: unknown, root: string): unknown => {
	if (typeof value === "string") {
		return value.replaceAll("$ROOT", root);
	}
	if (Array.isArray(value)) {
		return value.map((v) => sub(v, root));
	}
	if (value !== null && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value).map(([k, v]) => [k, sub(v, root)]),
		);
	}
	return value;
};

const place = async (root: string, rel: string, e: Entry) => {
	const full = join(root, rel);
	await mkdir(e.dir === true ? full : dirname(full), { recursive: true });
	if (e.link !== undefined) {
		await symlink(e.link.replaceAll("$ROOT", root), full);
	} else if (e.dir !== true) {
		await writeFile(full, e.text ?? "");
	}
};

// Writes the record's before-tree into a fresh directory and returns it with the args rooted there.
export const materialize = async (rec: Rec) => {
	const root = await tempDir("cos-fx-");
	// Links go last: one may point at a directory or file another entry creates.
	const entries = Object.entries(rec.before ?? {});
	await Promise.all(
		entries
			.filter(([, e]) => e.link === undefined)
			.map(([r, e]) => place(root, r, e)),
	);
	await Promise.all(
		entries
			.filter(([, e]) => e.link !== undefined)
			.map(([r, e]) => place(root, r, e)),
	);
	return { root, args: sub(rec.args, root), expected: sub(rec.outcome, root) };
};

// The files of a tree as path to text, the way a record's `after` lists them.
export const snapshot = async (
	root: string,
	dir = "",
): Promise<Record<string, string>> => {
	const entries = await readdir(join(root, dir), { withFileTypes: true });
	const parts = await Promise.all(
		entries.map(async (e): Promise<Record<string, string>> => {
			const rel = join(dir, e.name);
			if (e.isSymbolicLink()) {
				return {};
			}
			if (e.isDirectory()) {
				return snapshot(root, rel);
			}
			return { [rel]: await readFile(join(root, rel), "utf8").catch(() => "") };
		}),
	);
	return Object.fromEntries(parts.flatMap((p) => Object.entries(p)));
};
