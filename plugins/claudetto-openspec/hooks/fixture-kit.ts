// Bun-only helpers for fixtures.spec.ts: the ported upstream records and a `$.fs` made of node:fs.
import {
	lstat,
	mkdir,
	mkdtemp,
	readdir,
	readFile,
	realpath,
	stat,
	symlink,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { isObject, items } from "./fixture-shape.ts";
import type { Fs } from "./fs.ts";

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

const kindOf = (e: { isDirectory: () => boolean; isFile: () => boolean }) => {
	if (e.isDirectory()) {
		return "dir";
	}
	return e.isFile() ? "file" : "other";
};

export const nodeFs: Fs = {
	read: (path) => readFile(path, "utf8"),
	write: async (path, text) => {
		await mkdir(dirname(path), { recursive: true });
		await writeFile(path, text);
	},
	list: async (path) => {
		const entries = await readdir(path ?? ".", { withFileTypes: true });
		return entries.map((e) => ({
			name: e.name,
			kind: kindOf(e),
			size: 0,
			mtimeMs: 0,
			isLink: e.isSymbolicLink(),
		}));
	},
	exists: async (path) => {
		try {
			await stat(path);
			return true;
		} catch {
			return false;
		}
	},
	stat: async (path, options) => {
		const info = await stat(path);
		const own = await lstat(path);
		return {
			kind: kindOf(info),
			size: info.size,
			mtimeMs: info.mtimeMs,
			isLink: own.isSymbolicLink(),
			...(options?.resolve === true && { realPath: await realpath(path) }),
		};
	},
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
	const root = await mkdtemp(join(tmpdir(), "cos-fx-"));
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
