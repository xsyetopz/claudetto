import type { EngineInterface, On } from "claude-code";

import {
	GIT_FAILED,
	PATH_DESCRIPTION,
	TOOL_DESCRIPTION,
	TOOL_FULL_NAME,
	TOOL_NAME,
	UNKNOWN_PATH
} from "../texts";
import { readBaseline, sessionReport } from "./baseline";
import { gather, LIST_ARGV } from "./gather";
import { isSpecFile, listPaths } from "./paths";
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

/**
 * Runs the check against the working directory and returns the JSON text. With a
 * session-start baseline, drift and tampering count from the start, not HEAD (RISK-519).
 */
export async function runSpecCheck(
	$: EngineInterface,
	path: string | undefined
): Promise<string> {
	const listed = await $.process.run(LIST_ARGV);
	if (listed.exitCode !== 0) {
		return GIT_FAILED + listed.stderr.trim();
	}
	if (
		path !== undefined &&
		!(isSpecFile(path) && listPaths(listed.stdout).includes(path))
	) {
		return UNKNOWN_PATH + path;
	}
	const base = await readBaseline($);
	const input = await gather($, listed.stdout);
	const report =
		base === undefined
			? checkSpecs({ ...input, path })
			: sessionReport(input, base, path);
	return JSON.stringify(report, null, 2);
}

/** Registers `spec_check` for the session; a failure is logged and leaves the session running. */
export async function registerTool($: EngineInterface): Promise<void> {
	try {
		await $.tool.register(SPEC_TOOL);
	} catch (error) {
		$.ui.log(
			`claudetto-spec: spec_check registration failed: ${String(error)}`,
			{
				to: "debug"
			}
		);
	}
}

/** Serves `spec_check` calls; `register.ts` registers the tool at session start. */
export function registerSpecCheck(on: On): void {
	on("tool.run", { tool: TOOL_FULL_NAME }, async ($, e) => ({
		result: await runSpecCheck($, e.path)
	})).catch(($) => {
		$.ui.log("claudetto-spec: spec_check failed", { to: "debug" });
		return { deny: "spec_check failed; see the debug log" };
	});
}
