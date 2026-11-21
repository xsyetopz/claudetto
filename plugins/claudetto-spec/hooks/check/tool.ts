import type { EngineInterface, On } from "claude-code";

import {
	GIT_FAILED,
	PATH_DESCRIPTION,
	TOOL_DESCRIPTION,
	TOOL_FULL_NAME,
	TOOL_NAME,
	UNKNOWN_PATH
} from "../texts";
import { isSpecFile, isTestFile, listPaths, wantedPaths } from "./paths";
import { type CheckInput, checkSpecs } from "./spec";

/** The `spec_check` registration: deferred, one optional `path`. */
export const SPEC_TOOL = {
	name: TOOL_NAME,
	description: TOOL_DESCRIPTION,
	inputSchema: {
		type: "object",
		properties: { path: { type: "string", description: PATH_DESCRIPTION } }
	},
	isDeferred: true
};

/** Git with `core.quotePath=false`, so a non-ASCII path prints as itself, not as an octal escape. */
function git(args: string[]): string[] {
	return ["git", "-c", "core.quotePath=false", ...args];
}

/** The stdout of each `git show <ref>` that succeeds; a ref git cannot resolve has no entry. */
async function showAll(
	$: EngineInterface,
	refs: Map<string, string>
): Promise<Map<string, string>> {
	const shown = new Map<string, string>();
	await Promise.all(
		[...refs].map(async ([path, ref]) => {
			const out = await $.process.run(git(["show", ref]));
			if (out.exitCode === 0) {
				shown.set(path, out.stdout);
			}
		})
	);
	return shown;
}

async function readAll(
	$: EngineInterface,
	paths: string[]
): Promise<Map<string, string>> {
	const texts = new Map<string, string>();
	await Promise.all(
		paths.map(async (path) => {
			try {
				const text = await $.fs.read(path);
				if (typeof text === "string") {
					texts.set(path, text);
				}
			} catch {
				// A path git lists may be deleted or over the read limit; it counts as empty.
			}
		})
	);
	return texts;
}

/** The stdout of a git command whose failure leaves the answer empty. */
async function gitOut($: EngineInterface, args: string[]): Promise<string> {
	const out = await $.process.run(git(args));
	return out.exitCode === 0 ? out.stdout : "";
}

/** Gathers the git outputs and file texts one check reads; `check` itself never shells out. */
async function gather(
	$: EngineInterface,
	listing: string
): Promise<Omit<CheckInput, "path">> {
	const diff = await gitOut($, ["diff", "--name-only"]);
	const deleted = await gitOut($, ["diff", "--name-only", "--diff-filter=D"]);
	const listed = listPaths(listing);
	const gone = new Set(listPaths(deleted));
	const staged = listPaths(diff).filter((p) => isTestFile(p) && !gone.has(p));
	const [head, index, texts] = await Promise.all([
		showAll(
			$,
			new Map(listed.filter((p) => isSpecFile(p)).map((p) => [p, `HEAD:${p}`]))
		),
		showAll($, new Map(staged.map((p) => [p, `:${p}`]))),
		readAll($, wantedPaths(listing))
	]);
	return { listing, diff, deleted, head, index, texts };
}

/** Runs the check against the working directory and returns the JSON text. */
export async function runSpecCheck(
	$: EngineInterface,
	path: string | undefined
): Promise<string> {
	const listed = await $.process.run(
		git(["ls-files", "--cached", "--others", "--exclude-standard"])
	);
	if (listed.exitCode !== 0) {
		return GIT_FAILED + listed.stderr.trim();
	}
	if (
		path !== undefined &&
		!(isSpecFile(path) && listPaths(listed.stdout).includes(path))
	) {
		return UNKNOWN_PATH + path;
	}
	const input = await gather($, listed.stdout);
	return JSON.stringify(checkSpecs({ ...input, path }), null, 2);
}

/** Registers `spec_check` at session start and serves its calls. */
export function registerSpecCheck(on: On): void {
	on("session.start", ($, e, next) =>
		$.tool.register(SPEC_TOOL).then(() => next(e))
	).catch(($, e, next) => {
		$.ui.log("claudetto-spec: spec_check registration failed", { to: "debug" });
		return next(e);
	});
	on("tool.run", { tool: TOOL_FULL_NAME }, async ($, e) => ({
		result: await runSpecCheck($, e.path)
	})).catch(($) => {
		$.ui.log("claudetto-spec: spec_check failed", { to: "debug" });
		return { deny: "spec_check failed; see the debug log" };
	});
}
