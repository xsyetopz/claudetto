import type { EngineInterface, On } from "claude-code";

import { isAbsent } from "../../absent";
import { sessionFolders } from "../../session.end/useSessionTempCleanup/cleanup";
import { HANDOFF_NOTICE, HANDOFF_OPENING } from "../../texts";

/** Context use, in percent of the window, from which the model is asked for a handoff: it leaves room for the handoff turn and sits well under the level where Claude Code compacts. */
export const HANDOFF_PERCENT = 60;

const HANDOFF_FILE = "handoff.md";

async function handoffPath($: EngineInterface): Promise<string | undefined> {
	const [folder] = await sessionFolders($, await $.session.id());
	return folder === undefined ? undefined : `${folder}/${HANDOFF_FILE}`;
}

async function handoffText(
	$: EngineInterface,
	path: string,
): Promise<string | undefined> {
	try {
		return await $.fs.read(path);
	} catch (error) {
		if (!isAbsent(error)) {
			$.ui.log(`The handoff file was not read (${String(error)})`);
		}
		return undefined;
	}
}

let asked = false;

/** Called from the one `session.measure` hook, which an engine takes once per module: past `HANDOFF_PERCENT` it appends the notice, once for each fill. */
export async function askForHandoff(
	$: EngineInterface,
	percent: number | undefined,
): Promise<void> {
	if ((percent ?? 0) < HANDOFF_PERCENT) {
		asked = false;
		return;
	}
	const path = asked ? undefined : await handoffPath($);
	if (path !== undefined) {
		asked = true;
		await $.session.append({
			message: {
				type: "user",
				content: [{ type: "text", text: HANDOFF_NOTICE(path) }],
			},
		});
	}
}

/**
 * Compaction by handoff: the turn that ends after the model wrote its handoff file compacts with that file as the whole new context, and no summarizer request runs.
 * A `/compact` with no handoff file takes the built-in path.
 */
export const handoffHooks = (on: On): void => {
	on("turn.complete", async ($, e, next) => {
		if (asked && e.agentId === undefined) {
			const path = await handoffPath($);
			if (path !== undefined && (await handoffText($, path)) !== undefined) {
				// A headless session rejects the call, and its next turn tries again.
				await $.session.compact().catch((error: unknown) => {
					$.ui.log(`The handoff compaction did not run (${String(error)})`);
				});
			}
		}
		return next(e);
	});
	on("session.compact", async ($, e, next) => {
		const path = e.agentId === undefined ? await handoffPath($) : undefined;
		const handoff = path === undefined ? undefined : await handoffText($, path);
		if (path === undefined || handoff === undefined) {
			return next(e);
		}
		await $.process.run(["rm", path], { cwd: "/", timeoutMs: 1000 });
		return {
			messages: [
				{ role: "user", text: HANDOFF_OPENING(handoff), toolUses: [] },
			],
		};
	});
};
