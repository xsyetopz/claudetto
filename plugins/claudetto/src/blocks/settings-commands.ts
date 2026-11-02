// Both commands that write the user settings live in one file, because the hook loader takes `$` into a helper only within the file that defines it.

import type { EngineInterface, HookFor } from "claude-code";
import { settingsFileFor, settingsOf } from "../settings-file.ts";
import { refusedPaths } from "../tiers/keys.ts";
import { applyTier, type Json, settingsText } from "../tiers/merge.ts";
import { tierReport } from "../tiers/report.ts";
import { tierSnippet } from "../tiers/snippet.ts";
import { statusLineSnippet } from "../tiers/status-line.ts";
import { SNIPPET_ROW } from "../tiers/tiers.ts";
import { differencesOf, setupWrite } from "./setup-command/diff.ts";
import { askKept } from "./setup-command/questions.ts";
import {
	CODE_RULES,
	rulesDifference,
	userRulesFile,
} from "./setup-command/rules.ts";
import {
	nothingToAsk,
	platformNamed,
	SETUP_COMMAND,
	setupReport,
	UNAME_MS,
} from "./setup-command/setup.ts";
import {
	deniedText,
	deniesSetupAgent,
	unreadableText,
} from "./status-line/hooks.ts";

interface UserSettings {
	readonly file: string;
	readonly held: Json | undefined;
}

const userSettings = async ($: EngineInterface): Promise<UserSettings> => {
	const file = settingsFileFor(
		await $.env.get("CLAUDE_CONFIG_DIR"),
		await $.env.get("HOME"),
	);
	return {
		file,
		held: settingsOf(
			(await $.fs.exists(file)) ? await $.fs.read(file) : undefined,
		),
	};
};

const unameOf = async ($: EngineInterface): Promise<string> => {
	try {
		const result = await $.process.run(["uname", "-s"], {
			timeoutMs: UNAME_MS,
		});
		return result.stdout;
	} catch {
		return "";
	}
};

/** The answer when the write fails, or `undefined` once the file is written. */
const writeFailure = async (
	$: EngineInterface,
	file: string,
	settings: Json,
): Promise<{ text: string } | undefined> => {
	try {
		await $.fs.write(file, settingsText(settings));
		return undefined;
	} catch (error) {
		return {
			text: `Could not write ${file} (${String(error)}). Nothing changed.`,
		};
	}
};

const textOf = async (
	$: EngineInterface,
	path: string,
): Promise<string | undefined> => {
	try {
		return (await $.fs.exists(path)) ? await $.fs.read(path) : undefined;
	} catch {
		return undefined;
	}
};

interface RulesFiles {
	readonly path: string;
	readonly held: string | undefined;
	readonly shipped: string | undefined;
}

const rulesFiles = async (
	$: EngineInterface,
	settingsFile: string,
): Promise<RulesFiles> => {
	const path = userRulesFile(settingsFile);
	return {
		path,
		held: await textOf($, path),
		shipped: await textOf($, `${$.plugin.root}/${CODE_RULES}`),
	};
};

const rulesReport = async (
	$: EngineInterface,
	{ path, held, shipped }: RulesFiles,
): Promise<string> => {
	if (shipped === undefined || held === shipped) {
		return `${path} already holds the shipped code rules. It was not written.`;
	}
	try {
		await $.fs.write(path, shipped);
		return `Wrote ${path}. A new session loads it after its first file read.`;
	} catch (error) {
		return `Could not write ${path} (${String(error)}).`;
	}
};

/** The merge stays in code, so the model never edits the settings file by hand. */
export const onSetupCommand: HookFor<"command.run"> = async ($, _e, _next) => {
	const { file, held } = await userSettings($);
	if (held === undefined) {
		return {
			text: `${file} could not be read as a JSON object, so nothing was written. Fix the file and run /${SETUP_COMMAND} again.`,
		};
	}
	const snippet = tierSnippet(SNIPPET_ROW, platformNamed(await unameOf($)));
	const rules = await rulesFiles($, file);
	const offer = rulesDifference(rules.shipped, rules.held);
	const differences = [
		...differencesOf(held, snippet),
		...(offer === undefined ? [] : [offer]),
	];
	if (differences.length === 0) {
		return { text: nothingToAsk(file) };
	}
	const ids = await askKept(
		(question, options) => $.ui.ask(question, options),
		differences,
	);
	if (ids === undefined) {
		return {
			text: `Nothing was written: a question was dismissed, or this session has no one to answer. ${file} was not changed.`,
		};
	}
	const write = setupWrite(
		held,
		snippet,
		ids.filter((id) => id !== CODE_RULES),
	);
	const failed =
		write.applied.written.length === 0
			? undefined
			: await writeFailure($, file, write.applied.settings);
	const rulesLine = ids.includes(CODE_RULES)
		? [await rulesReport($, rules)]
		: [];
	return {
		text: [failed?.text ?? setupReport(file, write), ...rulesLine].join("\n"),
	};
};

export const onStatuslineCommand: HookFor<"command.run"> = async (
	$,
	e,
	next,
) => {
	let settings: UserSettings;
	try {
		settings = await userSettings($);
	} catch {
		return next(e);
	}
	const { file, held } = settings;
	if (e.args.trim() !== "") {
		return held !== undefined && deniesSetupAgent(held)
			? { text: deniedText(file) }
			: next(e);
	}
	if (held === undefined) {
		return { text: unreadableText(file) };
	}
	const snippet = statusLineSnippet();
	const applied = applyTier(held, snippet, refusedPaths(snippet));
	if (applied.written.length === 0) {
		return { text: tierReport(undefined, applied) };
	}
	const failed = await writeFailure($, file, applied.settings);
	return (
		failed ?? {
			text: `${tierReport(undefined, applied)}
Wrote ${file}.`,
		}
	);
};
