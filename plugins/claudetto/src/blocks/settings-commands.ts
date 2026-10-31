// Both commands that write the user settings live in one file, because the hook loader takes `$` into a helper only within the file that defines it.

import type { EngineInterface, HookFor, MatchedHook } from "claude-code";
import { settingsFileFor, settingsOf } from "../settings-file.ts";
import { refusedPaths } from "../tiers/keys.ts";
import { applyTier, type Json, settingsText } from "../tiers/merge.ts";
import { tierReport } from "../tiers/report.ts";
import { tierSnippet } from "../tiers/snippet.ts";
import { statusLineSnippet } from "../tiers/status-line.ts";
import { SNIPPET_ROW } from "../tiers/tiers.ts";
import { differencesOf, setupWrite } from "./setup-command/diff.ts";
import {
	diffReply,
	keptIds,
	platformNamed,
	SETUP_COMMAND,
	SETUP_DESCRIPTION,
	SETUP_INPUT_SCHEMA,
	type SETUP_MATCH,
	SETUP_TOOL,
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

const declareSetup = ($: EngineInterface): Promise<unknown> =>
	$.tool.register({
		name: SETUP_TOOL,
		description: SETUP_DESCRIPTION,
		inputSchema: SETUP_INPUT_SCHEMA,
	});

/** `$.tool.register` rejects until the session binds, so a refusal before `next` is retried after. */
export const onSetupStart: HookFor<"session.start"> = async ($, e, next) => {
	let early = true;
	try {
		await declareSetup($);
	} catch {
		early = false;
	}
	const started = await next(e);
	if (!early) {
		await declareSetup($).catch(() => undefined);
	}
	return started;
};

/** The merge stays in code, so the model never edits the settings file by hand. */
export const onSetupTool: MatchedHook<"tool.call", typeof SETUP_MATCH> = async (
	$,
	e,
	_next,
) => {
	const { file, held } = await userSettings($);
	if (held === undefined) {
		return {
			result: `${file} could not be read as a JSON object, so nothing was written. Tell the user to fix the file and run /${SETUP_COMMAND} again.`,
		};
	}
	const snippet = tierSnippet(SNIPPET_ROW, platformNamed(await unameOf($)));
	const ids = keptIds(e);
	if (ids === undefined) {
		return { result: diffReply(file, differencesOf(held, snippet)) };
	}
	const write = setupWrite(held, snippet, ids);
	const failed =
		write.applied.written.length === 0
			? undefined
			: await writeFailure($, file, write.applied.settings);
	return { result: failed?.text ?? setupReport(file, write) };
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
