import type { On } from "claude-code";

/** An in-memory file system behind the engine's fs and process operations, rooted at `/repo`. */
export interface Disk {
	files: Map<string, string>;
	deleted: string[];
	/** Instruction files `fs.ancestors` returns, by the directory they stand in. */
	nested: { dir: string; name: string; content: string }[];
}

export const CWD = "/repo";

/** A disk holding `files`, with nothing deleted and no nested instruction files. */
export const disk = (files: Record<string, string>): Disk => ({
	files: new Map(Object.entries(files)),
	deleted: [],
	nested: []
});

/** The refusal text of a call, which `$.tool.call` returns as an error result. */
export const refusal = (r: {
	deny?: string | undefined;
	text?: string | undefined;
}): string | undefined => r.deny ?? r.text;

/** A patch text around its file sections. */
export const wrap = (...sections: string[]): string =>
	["*** Begin Patch", ...sections, "*** End Patch"].join("\n");

/** Every folder that holds a file of the disk, plus the root and the session directory. */
const dirsOf = (d: Disk): Set<string> => {
	const out = new Set<string>(["/", CWD]);
	for (const path of d.files.keys()) {
		for (
			let at = path;
			at.includes("/");
			at = at.slice(0, at.lastIndexOf("/"))
		) {
			out.add(at.slice(0, at.lastIndexOf("/")) || "/");
		}
	}
	return out;
};

/** Wires the fs operations to `d`. */
function wireFs(on: On, d: Disk): void {
	on("fs.exists", (_$, e) => ({
		value: d.files.has(e.path) || dirsOf(d).has(e.path)
	}));
	on("fs.read", (_$, e) => ({ value: d.files.get(e.path) ?? "" }));
	on("fs.write", (_$, e) => {
		d.files.set(e.path, e.text);
		return { value: undefined };
	});
	on("fs.stat", (_$, e) => {
		if (!d.files.has(e.path) && !dirsOf(d).has(e.path)) {
			throw new Error("ENOENT");
		}
		return {
			value: {
				kind: d.files.has(e.path) ? "file" : "dir",
				size: 0,
				mtimeMs: 0,
				isLink: false,
				realPath: e.path
			}
		};
	});
	on("fs.list", (_$, e) => ({
		value: [...d.files.keys()]
			.filter(
				(p) =>
					p.startsWith(`${e.path}/`) &&
					!p.slice(e.path.length + 1).includes("/")
			)
			.map((p) => ({
				name: p.slice(e.path.length + 1),
				kind: "file" as const,
				size: 0,
				mtimeMs: 0,
				isLink: false
			}))
	}));
	on("fs.ancestors", () => ({
		value: d.nested.map((n) => ({ ...n, parts: [] }))
	}));
}

/** Wires the operations a patch call reaches to `d`; `home` is the user's home folder. */
export function wireDisk(
	on: On,
	d: Disk,
	{ home = "/home/u", isAllowing = true } = {}
): void {
	on("session.start", (_$, e) => ({ cwd: e.cwd }));
	// Nothing beneath the plugins answers a permission check, so every tool is allowed unless a test says otherwise.
	if (isAllowing) {
		on("tool.check", () => ({ decision: "allow" }));
	}
	on("session.cwd", () => ({ value: CWD }));
	on("tool.register", (_$, e) => ({ value: { tool: e.name } }));
	on("ui.log", () => ({ value: undefined }));
	on("env.get", () => ({ value: home }));
	wireFs(on, d);
	on("process.run", (_$, e) => {
		const target = e.argv.at(-1) ?? "";
		if (e.argv[0] === "rm") {
			d.files.delete(target);
			d.deleted.push(target);
		}
		return {
			value: {
				exitCode: 0,
				stdout: "",
				stderr: "",
				isStdoutTruncated: false,
				isStderrTruncated: false
			}
		};
	});
}
