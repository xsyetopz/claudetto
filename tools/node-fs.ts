// A `$.fs` made of node:fs, for a tool or a Bun-run test that runs the OpenSpec plugin's code outside the lab.
import {
	lstat,
	mkdir,
	readdir,
	readFile,
	realpath,
	stat,
	writeFile,
} from "node:fs/promises";
import { dirname } from "node:path";

import type { Fs } from "../plugins/claudetto-openspec/hooks/fs.ts";

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
