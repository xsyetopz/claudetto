import type { EngineInterface } from "claude-code";

import { startPatch } from "../patch/tool";
import { startRead } from "../read/tool";

/**
 * Registers the tools that replace the built-in file tools: `patch` for Write
 * and Edit, `read` for Read. They share one call because settings/start.ts
 * holds the plugin's one unmatched `session.start` hook and a dependency cap.
 *
 * @param $ The engine.
 */
export async function startFileTools($: EngineInterface): Promise<void> {
	await startPatch($);
	await startRead($);
}
