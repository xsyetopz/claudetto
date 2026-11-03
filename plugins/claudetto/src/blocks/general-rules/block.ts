import type { EngineInterface, On } from "claude-code";
import { settingsFileFor } from "../../settings-file.ts";
import type { Block } from "../block.ts";
import { GENERAL_RULES, sectionOf, userClaudeMdFile } from "./rules.ts";

export const generalRules: Block = {
	id: "general-rules",
	kind: "session",
	routes: ["classic.SessionStart", "env.get", "fs.exists", "fs.read"],
	needs: "2.1.314",
};

/** The user's `CLAUDE.md`, or `undefined` when it is absent or cannot be read. */
const userClaudeMd = async (
	$: EngineInterface,
): Promise<string | undefined> => {
	const file = userClaudeMdFile(
		settingsFileFor(
			await $.env.get("CLAUDE_CONFIG_DIR"),
			await $.env.get("HOME"),
		),
	);
	try {
		return (await $.fs.exists(file)) ? await $.fs.read(file) : undefined;
	} catch {
		return undefined;
	}
};

export const attachGeneralRules = (on: On): void => {
	// The context of a `SessionStart` hook is lost after `clear` and `compact`, so those two add it again.
	on(
		"classic.SessionStart",
		{ source: ["startup", "clear", "compact"] },
		async ($, e, next) => {
			const answer = await next(e);
			if (sectionOf(await userClaudeMd($)) !== undefined) {
				return answer;
			}
			return {
				...answer,
				additionalContext: [...(answer.additionalContext ?? []), GENERAL_RULES],
			};
		},
	);
};
