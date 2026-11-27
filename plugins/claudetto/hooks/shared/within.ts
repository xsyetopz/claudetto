import type { EngineInterface } from "claude-code";

import { fault } from "./fault";

/**
 * Runs `work` and waits for it at most `ms`; past that the hook goes on and `work`
 * finishes on its own, a fault logged under `where`. A typed slash command waits on the whole
 * `session.start` dispatch, so one engine call that never answers kept "Running SessionStart
 * hooks…" on screen for hours (ISSUES-part11).
 */
export async function within(
	$: EngineInterface,
	ms: number,
	where: string,
	work: () => Promise<unknown>
): Promise<void> {
	const run = work().catch((error: unknown) => {
		fault($, where, error);
	});
	await Promise.race([run, $.clock.sleep(ms).catch(() => run)]);
}
