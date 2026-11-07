import type { EngineInterface, On } from "claude-code";
import { BOUND_OUTPUT_DIR } from "./limits/bound-output.ts";
import { didWrite, WRITERS } from "./limits/stop.ts";
import { PERSON, rootOf } from "./pin.ts";
import { SLICE_COMMIT, SLICE_OTHERS } from "./texts.ts";

const RENAMED = /^[RC]/;

const git = async (
	$: EngineInterface,
	argv: string[],
): Promise<string | undefined> => {
	const r = await $.process.run(["git", ...argv]).catch(() => undefined);
	return r?.exitCode === 0 ? r.stdout : undefined;
};

/** The blob hash of each file, "" for one git cannot read; one call, or one per file when the batch fails on a vanished file. */
const hashes = async (
	$: EngineInterface,
	files: readonly string[],
): Promise<string[]> => {
	if (files.length === 0) {
		return [];
	}
	const all = (await git($, ["hash-object", "--", ...files]))
		?.trimEnd()
		.split("\n");
	return all?.length === files.length
		? all
		: Promise.all(
				files.map(
					async (f) => (await git($, ["hash-object", "--", f]))?.trim() ?? "",
				),
			);
};

/** Absolute path -> hash of each path the cwd's repo reports as changed; a deleted path has hash "". */
const dirty = async ($: EngineInterface): Promise<Map<string, string>> => {
	const [status, up, cwd] = await Promise.all([
		git($, ["status", "--porcelain", "-z", "-uall"]),
		git($, ["rev-parse", "--show-cdup"]),
		$.session.cwd(),
	]);
	const root = rootOf(cwd, (up ?? "").trim());
	const fields = (status ?? "").split("\0");
	const entries: { path: string; gone: boolean }[] = [];
	for (let i = 0; i < fields.length; i++) {
		const field = fields[i] ?? "";
		// The plugin's own saved test output is not the agent's slice.
		if (field !== "" && !field.slice(3).startsWith(`${BOUND_OUTPUT_DIR}/`)) {
			entries.push({
				path: `${root}/${field.slice(3)}`,
				gone: field.slice(0, 2).includes("D"),
			});
		}
		// A rename or copy is followed by its source path.
		i += RENAMED.test(field) ? 1 : 0;
	}
	const live = entries.filter((e) => !e.gone);
	const hashed = await hashes(
		$,
		live.map((e) => e.path),
	);
	const out = new Map(entries.map((e) => [e.path, ""]));
	for (const [i, e] of live.entries()) {
		out.set(e.path, hashed[i] ?? "");
	}
	return out;
};

const shown = async ($: EngineInterface, paths: readonly string[]) => {
	const cwd = await $.session.cwd();
	return paths.map((p) =>
		p.startsWith(`${cwd}/`) ? p.slice(cwd.length + 1) : p,
	);
};

/**
 * Files the agent wrote, by the hash it left them with: an `Edit`, `Write`, or `NotebookEdit` hashes its file, and a Bash call counts each
 * file in the cwd's repo whose change status or content moved across it. A file another hand changed since has another hash and is left
 * alone; so is a file that was dirty before the session and has not moved. The one `git status` of a Bash call or prompt is the only sweep.
 */
export const slices = (on: On): void => {
	const mine = new Map<string, string>();
	// The cwd repo's changed files at the last sweep; absent until the first prompt takes the session's start.
	let known: Map<string, string> | undefined;
	let interactive = true;
	on("session.start", { isInteractive: [true, false] }, (_$, e, next) => {
		interactive = e.isInteractive;
		return next(e);
	});
	on("prompt.submit", { origin: { kind: PERSON } }, async ($, e, next) => {
		const now = await dirty($);
		const others = [...now].filter(([path, hash]) =>
			mine.has(path)
				? mine.get(path) !== hash
				: known !== undefined && known.get(path) !== hash,
		);
		const wrote = others.map(([path]) => mine.has(path));
		for (const [path] of others) {
			mine.delete(path);
		}
		known = now;
		const names = await shown(
			$,
			others.map(([path]) => path),
		);
		return others.length === 0
			? next(e)
			: next({
					...e,
					context: [
						...(e.context ?? []),
						SLICE_OTHERS(
							names.map((path, i) => ({ path, wrote: wrote[i] === true })),
						),
					],
				});
	});
	on("tool.call", { tool: WRITERS }, async ($, e, next) => {
		const answer = await next(e);
		if (didWrite(answer) && "file_path" in e) {
			mine.set(e.file_path, (await hashes($, [e.file_path]))[0] ?? "");
		}
		return answer;
	});
	on("tool.call", { tool: "Bash" }, async ($, e, next) => {
		const answer = await next(e);
		if (known !== undefined) {
			const after = await dirty($);
			for (const [path, hash] of after) {
				if (known.get(path) !== hash && mine.get(path) !== hash) {
					mine.set(path, hash);
				}
			}
			known = after;
		}
		return answer;
	});
	on("classic.Stop", { stop_hook_active: false }, async ($, e, next) => {
		const answer = await next(e);
		if (answer.block !== undefined || mine.size === 0) {
			return answer;
		}
		const commit = await $.tool.check({
			tool: "Bash",
			input: { command: "git commit" },
		});
		// A headless session has no one to answer an ask, so the commit it asks for could not be made.
		if (
			commit.decision === "deny" ||
			(commit.decision === "ask" && !interactive)
		) {
			return answer;
		}
		const files = [...mine.keys()];
		const now = await hashes($, files);
		const own = files.filter((path, i) => now[i] === mine.get(path));
		const status = await Promise.all(
			own.map((path) =>
				git($, [
					"-C",
					path.slice(0, path.lastIndexOf("/")),
					"status",
					"--porcelain",
					"--",
					path,
				]),
			),
		);
		const changed = own.filter((_, i) => (status[i] ?? "") !== "");
		return changed.length === 0
			? answer
			: { ...answer, block: SLICE_COMMIT(await shown($, changed)) };
	});
};
