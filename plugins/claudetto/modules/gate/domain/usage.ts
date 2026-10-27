// The gate at red (spec `usage-awareness`, "Gate at Red"): the 5-hour share asks before costly work.

import { bandOf } from "../../session/limits.ts";
import { commands } from "../../shell/domain/shell.ts";
import { baseName, stripWrappers } from "../../shell/domain/wrappers.ts";
import { ASK_USAGE_AGENT, ASK_USAGE_RECIPE } from "../prompts.ts";

/** The recipes of the `justfile` that run a paid session: the sandbox sessions and the eval recipes. `eval-budget` and `eval-stats` read results only. */
export const PAID_RECIPES: ReadonlySet<string> = new Set([
	"sandbox",
	"sandbox-alone",
	"eval",
	"eval-tune",
	"eval-variant",
]);

const JUST_WORD = /\bjust\b/;

/** True when `command` runs `just` with a paid recipe. */
export const runsPaidRecipe = (command: string): boolean =>
	commands(command).some((argv) => {
		const rest = stripWrappers(argv);
		if (baseName(rest[0] ?? "") !== "just") {
			return false;
		}
		const recipe = rest.slice(1).find((word) => !word.startsWith("-"));
		return recipe !== undefined && PAID_RECIPES.has(recipe);
	});

/** True when the call can ask at red: an `Agent` call, or a `Bash` command that names `just`. The check is cheap, so a call that cannot ask reads no usage. */
export const mayAsk = (tool: string, command: unknown): boolean =>
	tool === "Agent" ||
	(tool === "Bash" && typeof command === "string" && JUST_WORD.test(command));

/** The reason to ask for an `Agent` call while another agent runs, or `null`. */
const askWhileOthersRun = async (
	othersRun: () => Promise<boolean>,
	share: string,
): Promise<string | null> =>
	(await othersRun()) ? ASK_USAGE_AGENT({ share }) : null;

/**
 * The reason to ask for the call, or `null`.
 * It asks only when the 5-hour share is red, for an `Agent` call while another agent runs, and for a paid recipe.
 */
export const usageAsk = (call: {
	tool: string;
	command: unknown;
	fiveHour: number | undefined;
	othersRun: () => Promise<boolean>;
}): Promise<string | null> | string | null => {
	const { tool, command, fiveHour } = call;
	if (fiveHour === undefined || bandOf(fiveHour) !== "red") {
		return null;
	}
	const share = `${fiveHour}%`;
	if (tool === "Bash") {
		return typeof command === "string" && runsPaidRecipe(command)
			? ASK_USAGE_RECIPE({ share })
			: null;
	}
	return askWhileOthersRun(call.othersRun, share);
};
