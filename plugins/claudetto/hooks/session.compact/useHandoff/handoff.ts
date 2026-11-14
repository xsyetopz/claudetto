import type { EngineInterface, On } from "claude-code";

import { isAbsent } from "../../absent";
import { HANDOFF_NOTICE, HANDOFF_OPENING, HANDOFF_SKIP } from "../../texts";

/** Claude Code makes its session folder only once a tool has run, so the file sits in the base that folder lives under. */
async function handoffPath($: EngineInterface): Promise<string> {
	const base =
		(await $.env.get("CLAUDE_CODE_TMPDIR")) ??
		(await $.env.get("TMPDIR")) ??
		"/tmp";
	return `${base.replace(/\/$/u, "")}/claudetto-handoff-${await $.session.id()}.md`;
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

/**
 * Compaction by handoff. The first auto-compaction of the main loop with no handoff file is skipped, and the model is asked for the file instead;
 * the next compaction takes the file as the whole new context, and no summarizer request runs. Claude Code's own threshold sets the moment,
 * because `$.session.usage` reports a threshold that differs from the one it compacts at. A model that writes no file gets the built-in summary
 * on the compaction after the notice, as does a `/compact` with no file.
 */
export const handoffHooks = (on: On): void => {
	let asked = false;
	on("session.compact", async ($, e, next) => {
		if (e.agentId !== undefined) {
			return next(e);
		}
		const path = await handoffPath($);
		const handoff = await handoffText($, path);
		// A precompute installs nothing, so the file stays for the compaction that installs, and the summary it would buy goes unused.
		if (e.trigger === "precompute") {
			return handoff === undefined && !asked ? next(e) : { skip: HANDOFF_SKIP };
		}
		if (handoff !== undefined) {
			asked = false;
			await $.process.run(["rm", path], { cwd: "/", timeoutMs: 1000 });
			return {
				messages: [
					{ role: "user", text: HANDOFF_OPENING(handoff), toolUses: [] },
				],
			};
		}
		if (e.trigger !== "auto" || asked) {
			asked = false;
			return next(e);
		}
		asked = true;
		await $.session.append({
			message: {
				type: "user",
				content: [{ type: "text", text: HANDOFF_NOTICE(path) }],
			},
		});
		return { skip: HANDOFF_SKIP };
	});
};
