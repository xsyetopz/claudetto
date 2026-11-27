import type { EngineInterface, SessionStartInput } from "claude-code";

import { startFileTools } from "../pool/files";
import { fault } from "../shared/fault";
import { startWeb } from "../web/register";
import { installRules } from "./rules";

/**
 * Registers the file and web tools and installs the shipped rules. Each part
 * fails alone, so one fault leaves the others, the settings repair and the
 * session running.
 */
export async function startParts(
	$: EngineInterface,
	e: SessionStartInput
): Promise<void> {
	const parts: [string, () => Promise<unknown>][] = [
		["file tool registration", () => startFileTools($)],
		["web tool registration", () => startWeb($, e)],
		["rule install", () => installRules($)]
	];
	await Promise.all(
		parts.map(async ([where, run]) => {
			try {
				await run();
			} catch (error) {
				fault($, where, error);
			}
		})
	);
}
