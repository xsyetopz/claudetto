// An in-memory tree behind the engine's fs and process ops, for lab tests (no node APIs there).
import type { On } from "claude-code";

const ROOT = "/repo";

export const memory = (on: On, files: Record<string, string>) => {
	const tree = new Map(Object.entries(files));
	const runs: string[][] = [];
	const under = (dir: string) =>
		[...tree.keys()].filter((p) => p.startsWith(`${dir}/`));
	const isDir = (p: string) => under(p).length > 0;
	on("session.root", () => ({ value: ROOT }));
	on("session.cwd", () => ({ value: ROOT }));
	on("clock.now", () => ({ value: Date.UTC(2026, 10, 6) }));
	on("fs.exists", (_$, e) => ({ value: tree.has(e.path) || isDir(e.path) }));
	on("fs.read", (_$, e) => {
		const text = tree.get(e.path);
		if (text === undefined) {
			throw new Error(`ENOENT ${e.path}`);
		}
		return { value: text };
	});
	on("fs.write", (_$, e) => {
		tree.set(e.path, e.text);
		return { value: undefined };
	});
	on("fs.stat", (_$, e) => {
		if (!(tree.has(e.path) || isDir(e.path))) {
			throw new Error(`ENOENT ${e.path}`);
		}
		return {
			value: {
				kind: tree.has(e.path) ? "file" : "dir",
				size: 0,
				mtimeMs: 0,
				isLink: false,
				realPath: e.path,
			},
		};
	});
	on("fs.list", (_$, e) => {
		const names = new Map<string, "file" | "dir">();
		for (const p of under(e.path)) {
			const [head, ...rest] = p.slice(e.path.length + 1).split("/");
			if (head) {
				names.set(head, rest.length > 0 ? "dir" : "file");
			}
		}
		return {
			value: [...names].map(([name, kind]) => ({
				name,
				kind,
				size: 0,
				mtimeMs: 0,
				isLink: false,
			})),
		};
	});
	on("process.run", (_$, e) => {
		runs.push([...e.argv]);
		const [cmd, src, dst] = e.argv;
		if (cmd === "mv" && src && dst) {
			for (const p of [...tree.keys()].filter((k) => k.startsWith(`${src}/`))) {
				tree.set(dst + p.slice(src.length), tree.get(p) ?? "");
				tree.delete(p);
			}
		}
		return {
			value: {
				exitCode: 0,
				stdout: "",
				stderr: "",
				isStdoutTruncated: false,
				isStderrTruncated: false,
			},
		};
	});
	return { tree, runs };
};
