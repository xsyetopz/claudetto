// Both commands that write the user settings live in one file, because the hook loader takes `$` into a helper only within the file that defines it.

import type { EngineInterface, HookFor } from "claude-code";
import { settingsFileFor, settingsOf } from "../settings-file.ts";
import { groupLabels, keptSnippet } from "../tiers/groups.ts";
import { refusedPaths } from "../tiers/keys.ts";
import { applyTier, type Json, settingsText } from "../tiers/merge.ts";
import { tierReport } from "../tiers/report.ts";
import { tierSnippet } from "../tiers/snippet.ts";
import { statusLineSnippet } from "../tiers/status-line.ts";
import { SNIPPET_ROW } from "../tiers/tiers.ts";
import {
	chosenGroups,
	platformNamed,
	QUESTION,
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

const askedGroups = async ($: EngineInterface): Promise<readonly string[]> => {
	try {
		const answer = await $.ui.ask(QUESTION, {
			options: [...groupLabels()],
			header: "Setup",
			multiSelect: true,
		});
		return chosenGroups(answer);
	} catch {
		return [];
	}
};

export const onSetupCommand: HookFor<"command.run"> = async ($, _e, _next) => {
	const { file, held } = await userSettings($);
	if (held === undefined) {
		return {
			text: `${file} could not be read as a JSON object, so nothing was written. Fix the file and run /${SETUP_COMMAND} again.`,
		};
	}
	const kept = await askedGroups($);
	if (kept.length === 0) {
		return { text: "Nothing was chosen, so nothing was written." };
	}
	const snippet = keptSnippet(
		tierSnippet(SNIPPET_ROW, platformNamed(await unameOf($))),
		kept,
	);
	const applied = applyTier(held, snippet, refusedPaths(snippet));
	try {
		await $.fs.write(file, settingsText(applied.settings));
	} catch (error) {
		return {
			text: `Could not write ${file} (${String(error)}). Nothing changed.`,
		};
	}
	return { text: setupReport(file, kept, applied) };
};

export const onStatuslineCommand: HookFor<"command.run"> = async (
	$,
	e,
	next,
) => {
	try {
		const { file, held } = await userSettings($);
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
		if (applied.written.length > 0) {
			await $.fs.write(file, settingsText(applied.settings));
		}
		return {
			text: [
				tierReport(undefined, applied),
				...(applied.written.length > 0 ? [`Wrote ${file}.`] : []),
			].join("\n"),
		};
	} catch {
		return next(e);
	}
};
