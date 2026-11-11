import type { On } from "claude-code";
import type { Engine } from "claude-code/testing";

import { scanned } from "./secrets.mock.ts";

/** A fake repo at /repo: `dirty` maps an absolute path to its two-letter status, `hash` to its content hash. */
export const fakeRepo = (dirty: Record<string, string> = {}) => ({
	dirty,
	hash: Object.fromEntries<string>([]),
});
type Repo = ReturnType<typeof fakeRepo>;

interface WriteResult {
	isError?: true;
	result: unknown;
	text?: string;
}

const WRITTEN: WriteResult = { result: {} };

const answered = (stdout: string) => ({
	value: {
		exitCode: 0,
		stdout,
		stderr: "",
		isStdoutTruncated: false,
		isStderrTruncated: false,
	},
});

const statusRows = (
	repo: Repo,
	keep: (path: string) => boolean,
	row: (path: string, xy: string) => string,
): string =>
	Object.entries(repo.dirty)
		.filter(([path]) => keep(path))
		.map(([path, xy]) => row(path, xy))
		.join("");

const gitAnswer = (repo: Repo, argv: readonly string[]) => {
	const files = argv.slice(argv.indexOf("--") + 1);
	if (argv[1] === "hash-object") {
		return answered(files.map((f) => `${repo.hash[f] ?? "h0"}\n`).join(""));
	}
	if (argv[1] !== "status") {
		return answered("");
	}
	return answered(
		argv.includes("-z")
			? statusRows(
					repo,
					(path) => path.startsWith("/repo/"),
					(path, xy) => `${xy} ${path.slice("/repo/".length)}\0`,
				)
			: statusRows(
					repo,
					(path) => files.includes(path),
					(path, xy) => `${xy} ${path}\n`,
				),
	);
};

const wireSession = (on: On, answer: string): void => {
	on("session.start", () => ({ cwd: "/repo" }));
	on("tool.register", (_$, e) => ({
		value: { tool: `mcp__claudetto__${e.name}` },
	}));
	on("session.messages", () => ({ value: [] }));
	on("session.cwd", () => ({ value: "/repo" }));
	on("prompt.submit", (_$, e) => e);
	on("clock.now", () => ({ value: 0 }));
	on("fs.exists", () => ({ value: true }));
	on("env.get", () => ({ value: undefined }));
	on("model.complete", () => ({
		value: {
			isAnswered: true,
			text: answer,
			usage: {
				input_tokens: 1,
				output_tokens: 1,
				cache_read_input_tokens: 0,
				cache_creation_input_tokens: 0,
			},
		},
	}));
};

/** Stubs beneath the slice check: `commit` is the permission chain's answer for Bash, `answer` the ledger model's text, `stopped` another Stop hook's output, `write` the Write tool's result. */
export const lab = (
	on: On,
	repo: Repo,
	commit: "allow" | "ask" | "deny" = "allow",
	runs: string[][] = [],
	answer = '{"faults":[]}',
	stopped: { block?: string } = {},
	write: WriteResult = WRITTEN,
): void => {
	on("process.run", (_$, e, next) => {
		if (e.argv[0] === "git") {
			runs.push([...e.argv]);
			// `git -C dir status` is `status` with the directory moved in front.
			return gitAnswer(
				repo,
				e.argv[1] === "-C" ? ["git", ...e.argv.slice(3)] : e.argv,
			);
		}
		return scanned(e) ?? next(e);
	});
	on("classic.Stop", () => stopped);
	wireSession(on, answer);
	on("tool.check", (_$, e) => ({
		decision: e.tool === "Bash" ? commit : "allow",
	}));
	on("tool.call", (_$, e) => (e.tool === "Write" ? write : { result: {} }));
};

export const edit = ($: Engine, file_path = "/repo/src/a.ts") =>
	$.tool.call({
		tool: "Edit",
		tool_use_id: "t1",
		file_path,
		old_string: "a",
		new_string: "b",
	});

export const stop = ($: Engine, active = false) =>
	$.classic.Stop({
		stop_hook_active: active,
		last_assistant_message: "Done.",
		background_tasks: [],
	});

export const submit = ($: Engine) =>
	$.prompt.submit({
		text: "Fix it.",
		wait: false,
		origin: { kind: "composer" },
	});

export const bash = ($: Engine, command: string) =>
	$.tool.call({ tool: "Bash", tool_use_id: "t2", command });

export const A = "/repo/src/a.ts";

/** A repo with `dirty` files, wired and past its first prompt. */
export const started = async (
	$: Engine,
	on: On,
	dirty: Record<string, string> = {},
) => {
	const repo = fakeRepo(dirty);
	lab(on, repo);
	await submit($);
	return repo;
};
