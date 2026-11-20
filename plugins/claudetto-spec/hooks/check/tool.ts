import type { EngineInterface, On } from "claude-code";

import {
	GIT_FAILED,
	PATH_DESCRIPTION,
	TOOL_DESCRIPTION,
	TOOL_FULL_NAME,
	TOOL_NAME,
	UNKNOWN_PATH
} from "../texts";
import { isSpecFile, listPaths, wantedPaths } from "./paths";
import { checkSpecs } from "./spec";

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

/** Runs the check against the working directory and returns the JSON text. */
export async function runSpecCheck(
	$: EngineInterface,
	path: string | undefined
): Promise<string> {
	const listed = await $.process.run([
		"git",
		"ls-files",
		"--cached",
		"--others",
		"--exclude-standard"
	]);
	if (listed.exitCode !== 0) {
		return GIT_FAILED + listed.stderr.trim();
	}
	if (
		path !== undefined &&
		!(isSpecFile(path) && listPaths(listed.stdout).includes(path))
	) {
		return UNKNOWN_PATH + path;
	}
	const diff = await $.process.run(["git", "diff", "--name-only"]);
	const texts = await readAll($, wantedPaths(listed.stdout));
	const report = checkSpecs({
		listing: listed.stdout,
		diff: diff.exitCode === 0 ? diff.stdout : "",
		texts,
		path
	});
	return JSON.stringify(report, null, 2);
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
