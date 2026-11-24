import type { EngineInterface, On } from "claude-code";

import { fault } from "../shared/fault";
import { pathsIn } from "./paths";
import { endGoal, setGoal, TOOLS_NOTE, type Tracker } from "./state";

/** The warning for paths in a condition that do not exist. */
export const missingNote = (missing: readonly string[]): string =>
	`claudetto: ${missing.join(", ")} not found from the session directory. The evaluator judges from the transcript, so a wrong path never reads as met. ` +
	"Check the spelling; if the file is meant to be created, ignore this.";

/** Which of a condition's paths do not exist; `~` and absolute paths are checked as written. */
async function missingIn(
	$: EngineInterface,
	condition: string
): Promise<string[]> {
	const cwd = await $.session.cwd();
	const found = await Promise.all(
		pathsIn(condition).map(async (path) => {
			const full =
				path.startsWith("/") || path.startsWith("~") ? path : `${cwd}/${path}`;
			return (await $.fs.exists(full)) ? undefined : path;
		})
	);
	return found.filter((path): path is string => path !== undefined);
}

/**
 * Follows each `/goal` run, from the person or a plugin, into the tracker, and
 * warns when the new condition names a path that does not exist. The warning
 * only informs: the engine has no pre-set hook that refuses, and a refusal
 * would also block a goal that creates the file.
 */
export function registerCommand(on: On, tracker: Tracker): void {
	on("command.run", { command: "goal" }, async ($, e, next) => {
		const args = e.args.trim();
		const result = await next(e);
		if (args === "") {
			return result;
		}
		if (args === "clear") {
			endGoal(tracker, false);
			if (e.origin.kind !== "plugin") {
				delete tracker.paused;
			}
			return result;
		}
		if (!(result.text ?? "").startsWith("Goal set")) {
			return result;
		}
		setGoal(tracker, args);
		const missing = await missingIn($, args);
		return {
			...result,
			text: [result.text, ...(missing.length > 0 ? [missingNote(missing)] : [])]
				.filter((line) => line !== undefined)
				.join("\n"),
			context: [...(result.context ?? []), TOOLS_NOTE]
		};
	}).catch(($, e, next) => {
		fault($, "goal command", next.error);
		return next(e);
	});
}
