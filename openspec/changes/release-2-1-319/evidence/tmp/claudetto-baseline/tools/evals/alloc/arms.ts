// The arms differ in where the model is chosen: the main session, the subagent env, or the `Artemis` agent file.

import { cp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { QUIET_ENV } from "../../../claudekit/session/env.ts";
import { EVAL_MODEL } from "../../limits.ts";
import { PLUGIN_DIR } from "../session.ts";

export const HAIKU = "claude-haiku-5-5";

export const ALLOCATION_ARMS = [
	"control",
	"one subagent model",
	"Artemis on haiku",
	"opusplan",
] as const;

export type AllocationArm = (typeof ALLOCATION_ARMS)[number];

export const isAllocationArm = (value: string): value is AllocationArm =>
	ALLOCATION_ARMS.some((arm) => arm === value);

export const ARTEMIS_FILE = "agents/Artemis.md";

/** What an arm changes: the `--model` value, the session env, and whether the plugin folder is a copy. */
export interface Allocation {
	readonly model: string;
	readonly env: Readonly<Record<string, string>>;
	readonly pluginCopy: boolean;
	/** Where a subagent's model comes from, for the plan lines. */
	readonly subagents: string;
}

export const allocationOf = (arm: AllocationArm): Allocation => {
	switch (arm) {
		case "control":
			return {
				model: EVAL_MODEL,
				env: QUIET_ENV,
				pluginCopy: false,
				subagents: "each agent file's own model, else the session's",
			};
		case "one subagent model":
			return {
				model: EVAL_MODEL,
				env: { ...QUIET_ENV, CLAUDE_CODE_SUBAGENT_MODEL: HAIKU },
				pluginCopy: false,
				subagents: `CLAUDE_CODE_SUBAGENT_MODEL=${HAIKU}`,
			};
		case "Artemis on haiku":
			return {
				model: EVAL_MODEL,
				env: QUIET_ENV,
				pluginCopy: true,
				subagents: `Artemis.md names ${HAIKU} in a plugin copy`,
			};
		case "opusplan":
			return {
				model: "opusplan",
				env: QUIET_ENV,
				pluginCopy: false,
				subagents: "each agent file's own model, else the session's",
			};
	}
};

/** Adds `model: claude-haiku-5-5` to the frontmatter of `Artemis.md`; a file with a `model` line or no frontmatter is an error. */
export const withArtemisModel = (text: string): string => {
	const [open, ...rest] = text.split("\n");
	const end = rest.indexOf("---");
	if (open !== "---" || end < 0) {
		throw new Error("Artemis.md has no frontmatter");
	}
	if (rest.slice(0, end).some((line) => line.startsWith("model:"))) {
		throw new Error("Artemis.md already names a model");
	}
	return [open, `model: ${HAIKU}`, ...rest].join("\n");
};

/** The plugin folder of each arm: the tree's own, or one copy under `root` whose `Artemis.md` names the model. */
export const preparePlugins = async (
	treeRoot: string,
	root: string,
): Promise<Readonly<Record<AllocationArm, string>>> => {
	const source = join(treeRoot, PLUGIN_DIR);
	const copy = join(root, "artemis-plugin");
	await cp(source, copy, { recursive: true });
	const file = join(copy, ARTEMIS_FILE);
	await writeFile(file, withArtemisModel(await readFile(file, "utf8")));
	return {
		control: source,
		"one subagent model": source,
		"Artemis on haiku": copy,
		opusplan: source,
	};
};
