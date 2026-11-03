// The arms differ in the text of `Concise.md` alone: the plugin, the model, and the settings are the same.

import { cp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	claudeArgv,
	model,
	NO_SESSION_PERSISTENCE,
	outputFormat,
	type Part,
	pluginDir,
	print,
	settingSources,
	settings,
} from "../../../claudekit/session/argv.ts";
import type { CommandRunner } from "../../../claudekit/session/command.ts";
import { QUIET_ENV } from "../../../claudekit/session/env.ts";
import { EVAL_MODEL } from "../../limits.ts";
import { PLUGIN_DIR } from "../session.ts";

/** The text of `Concise` before the commit that rewrote each rule as an action. */
export const OLD_STYLE_COMMIT = "405ef771";

export const STYLE_FILE = "output-styles/Concise.md";

export const STYLE_ARMS = ["old", "new"] as const;

export type StyleArm = (typeof STYLE_ARMS)[number];

export const isStyleArm = (value: string): value is StyleArm =>
	STYLE_ARMS.some((arm) => arm === value);

/** An empty list of tools leaves the request without the tool schemas, so a reply is the one thing a session makes. */
const NO_TOOLS: Part = ["--tools", ""];

/** The reply cap, in tokens, which `max_tokens` of the request carries and so the price bound reads. */
export const MAX_OUTPUT_TOKENS = 2000;

export const styleEnv = (): Record<string, string> => ({
	...QUIET_ENV,
	CLAUDE_CODE_MAX_OUTPUT_TOKENS: String(MAX_OUTPUT_TOKENS),
});

/** `--setting-sources project,local` leaves user settings out; `outputStyle` in `--settings` picks the plugin's style. */
export const styleArgv = (prompt: string, dir: string): readonly string[] =>
	claudeArgv(
		print(prompt),
		outputFormat("json"),
		NO_SESSION_PERSISTENCE,
		settingSources("project", "local"),
		NO_TOOLS,
		pluginDir(dir),
		settings({ outputStyle: "claudetto:Concise" }),
		model(EVAL_MODEL),
	);

/**
 * The plugin folder of each arm. The new arm loads the tree's own folder; the old arm loads a copy under
 * `root` with the old `Concise.md`, so no file of the tree changes.
 */
export const preparePlugins = async (
	run: CommandRunner,
	treeRoot: string,
	root: string,
): Promise<Readonly<Record<StyleArm, string>>> => {
	const source = join(treeRoot, PLUGIN_DIR);
	const copy = join(root, "old-plugin");
	await cp(source, copy, { recursive: true });
	const shown = await run(
		["git", "show", `${OLD_STYLE_COMMIT}:${PLUGIN_DIR}/${STYLE_FILE}`],
		{ cwd: treeRoot },
	);
	if (shown.code !== 0) {
		throw new Error(`git show failed: ${shown.stderr}`);
	}
	await writeFile(join(copy, STYLE_FILE), shown.stdout);
	return { old: copy, new: source };
};
