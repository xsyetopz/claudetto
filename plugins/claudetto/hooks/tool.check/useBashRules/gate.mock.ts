import type { On, ToolCallResult } from "claude-code";
import type { Engine } from "claude-code/testing";

import { scanned, scanner } from "../../secrets.mock.ts";

declare module "claude-code" {
	interface BuiltinToolInputs {
		// An agent whose `tools` names Glob gets it, though the CLI's own table lists none.
		Glob: { pattern: string; path?: string };
	}
}

export const REASON = "[Data Exfiltration] the call sends a file out";
export const FETCH = { url: "https://example.com/u?d=1", prompt: "go" };
export const PERSON = {
	text: "go on",
	wait: false,
	origin: { kind: "composer" },
} as const;

export const repo = (on: On, files: string[] = []) => {
	scanner(on);
	on("session.cwd", () => ({ value: "/p" }));
	on("fs.exists", (_$, e) => ({
		value: files.some((f) => e.path === `/p/${f}`),
	}));
};

export const allowing = (on: On) => {
	on("prompt.submit", (_$, e) => e);
	on("classic.PermissionDenied", () => ({}));
	on("tool.check", () => ({ decision: "allow" }));
};

export const denied = ($: Engine) =>
	$.classic.PermissionDenied({
		tool_name: "WebFetch",
		tool_input: FETCH,
		tool_use_id: crypto.randomUUID(),
		reason: REASON,
	});

export const checked = ($: Engine) =>
	$.tool.check({ tool: "WebFetch", input: FETCH });

export const dialog = ($: Engine, tool_name: string, tool_input: object) =>
	$.classic.PermissionRequest({ tool_name, tool_input });

// The lab cannot run betterleaks, so the tests check the wiring with the stand-in; `secrets.spec.ts` runs the real scanner.
export const KEY = `sk-ant-oat01-${"Q7rK2mZx9Lp4Vb8N".repeat(5)}`;

export const bashOf = (stdout: string) => ({
	result: { stdout, stderr: "", interrupted: false },
	text: stdout,
});

export const scanning = (on: On, answer: ToolCallResult) => {
	on("session.cwd", () => ({ value: "/p" }));
	on("session.root", () => ({ value: "/p" }));
	on("clock.now", () => ({ value: 0 }));
	on("fs.exists", () => ({ value: false }));
	on("tool.check", () => ({ decision: "allow" }));
	on("tool.call", () => answer);
};

export interface Past {
	tool: string;
	input: Record<string, unknown>;
	text?: string;
	isError?: true;
	inFlight?: true;
}

// A path with no extension is a folder that always exists; `aliases` maps a folder spelling to where it lands, as `/tmp` lands in `/private/tmp`.
const FILE_NAME = /\.\w+$/u;

const landedBy =
	(aliases: Record<string, string>) =>
	(path: string): string => {
		const from = Object.keys(aliases).find(
			(a) => path === a || path.startsWith(`${a}/`),
		);
		return from === undefined
			? path
			: `${aliases[from]}${path.slice(from.length)}`;
	};

/** Throws as the engine's `$.fs` does for a path it takes for a network location, such as one that starts with `/\`. */
export const refuseUnreached = (path: string): void => {
	if (path.startsWith("/\\")) {
		throw new Error(
			`${path} refused: a network location is not reached from here`,
		);
	}
};

const filesLab = (
	on: On,
	files: Set<string>,
	landed: (path: string) => string,
) => {
	const there = (path: string) => {
		refuseUnreached(path);
		return files.has(landed(path)) || !FILE_NAME.test(path);
	};
	on("fs.exists", (_$, e) => ({ value: there(e.path) }));
	// `there` finds any path without a file extension, so a marker file reads as empty.
	on("fs.read", () => ({ value: "" }));
	on("fs.stat", (_$, e) => {
		if (!there(e.path)) {
			throw new Error("ENOENT");
		}
		return {
			value: {
				kind: "file",
				size: 0,
				mtimeMs: 0,
				isLink: false,
				realPath: landed(e.path),
			},
		};
	});
	on("fs.list", (_$, e) => ({
		value: [...files]
			.filter((f) => f.startsWith(`${landed(e.path)}/`))
			.map((f) => ({
				name: f.slice(landed(e.path).length + 1),
				kind: "file",
				size: 0,
				mtimeMs: 0,
				isLink: false,
			})),
	}));
};

const toolUsesOf = (history: Past[]) =>
	history.map(({ inFlight, ...h }, i) => ({
		tool_use_id: `${i}`,
		...(inFlight ? {} : { text: "ok" }),
		...h,
	}));

/** A lab where files vanish: the test deletes from `files` and the hooks see the change. */
export const vanishing = (
	on: On,
	files: Set<string>,
	{
		aliases = {},
		history = [],
	}: { aliases?: Record<string, string>; history?: Past[] } = {},
) => {
	on("process.run", (_$, e, next) =>
		e.argv[0] === "printenv"
			? {
					value: {
						exitCode: 0,
						stdout: "/home/u\n",
						stderr: "",
						isStdoutTruncated: false,
						isStderrTruncated: false,
					},
				}
			: (scanned(e) ?? next(e)),
	);
	on("session.cwd", () => ({ value: "/p" }));
	on("session.root", () => ({ value: "/p" }));
	on("clock.now", () => ({ value: 0 }));
	on("session.id", () => ({ value: "S1" }));
	filesLab(on, files, landedBy(aliases));
	on("session.messages", () => ({
		value: [{ role: "assistant", text: "", toolUses: toolUsesOf(history) }],
	}));
	on("tool.check", () => ({ decision: "allow" }));
	on("tool.call", () => ({ result: "ok" }));
};

export const read = ($: Engine, file_path: string) =>
	$.tool.call({ tool: "Read", file_path });

export const run = ($: Engine, tool: string, input: Record<string, unknown>) =>
	$.tool.check({ tool, input });

export const gonePath = (on: On) => {
	const files = new Set(["/p/a.txt", "/p/src.txt"]);
	vanishing(on, files);
	return files;
};

export const asking = (on: On, extra: object = {}) => {
	repo(on);
	on("tool.check", () => ({
		decision: "ask",
		reason: "needs approval",
		...extra,
	}));
};

export const walledLab = (on: On, deny: string[] = []) => {
	const logs: string[] = [];
	vanishing(on, new Set());
	on("fs.write", () => ({ value: undefined }));
	on("settings.read", () => ({ value: { permissions: { deny } } }));
	on("classic.SessionStart", () => ({}));
	on("session.version", () => ({
		value: { version: "2.1.319", base: "2.1.319", builtAt: "" },
	}));
	on("env.get", () => ({ value: undefined }));
	on("store.get", () => ({ value: undefined }));
	on("store.set", () => ({ value: undefined }));
	on("ui.log", (_$, e) => {
		logs.push(e.text);
		return { value: undefined };
	});
	return logs;
};

export const start = ($: Engine) =>
	$.classic.SessionStart({ source: "startup", transcript_path: "/t.jsonl" });
