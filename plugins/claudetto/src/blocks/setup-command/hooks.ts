import type { EngineInterface, HookFor } from "claude-code";
import { settingsFileIn } from "../../settings-file.ts";
import { groupLabels, KEY_GROUPS, keptSnippet } from "../../tiers/groups.ts";
import { refusedPaths } from "../../tiers/keys.ts";
import { applyTier, type Json, settingsText } from "../../tiers/merge.ts";
import { tierReport } from "../../tiers/report.ts";
import { tierSnippet, UNKNOWN_PLATFORM } from "../../tiers/snippet.ts";
import { SNIPPET_ROW } from "../../tiers/tiers.ts";

export const SETUP_COMMAND = "claudetto:setup";

/** The longest one `uname -s` run may take. */
const UNAME_MS = 2000;

const UNAME_PLATFORMS: Readonly<Record<string, string>> = {
	darwin: "darwin",
	linux: "linux",
};

const QUESTION = "Which settings should claudetto write?";

export const platformNamed = (uname: string): string =>
	UNAME_PLATFORMS[uname.trim().toLowerCase()] ?? UNKNOWN_PLATFORM;

export const chosenGroups = (answer: string): readonly string[] => {
	const labels = groupLabels();
	return answer
		.split(",")
		.map((part) => part.trim())
		.filter((part) => labels.includes(part));
};

const isObject = (value: unknown): value is Json =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const discardedLines = (kept: readonly string[]): readonly string[] =>
	KEY_GROUPS.filter((group) => !kept.includes(group.label)).map(
		(group) =>
			`Discarded ${group.label}: no key of it was written, and a key you already have stays. What it would have done: ${group.why}`,
	);

export const setupReport = (
	file: string,
	kept: readonly string[],
	applied: Parameters<typeof tierReport>[1],
): string =>
	[
		tierReport(undefined, applied),
		...discardedLines(kept),
		`Wrote ${file}. Restart Claude Code: the keys are read when it starts.`,
	].join("\n");

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

const settingsPath = async ($: EngineInterface): Promise<string> => {
	const [configDir, home] = await Promise.all([
		$.env.get("CLAUDE_CONFIG_DIR"),
		$.env.get("HOME"),
	]);
	return settingsFileIn(
		configDir === undefined || configDir === "" ? `${home}/.claude` : configDir,
	);
};

const heldSettings = async (
	$: EngineInterface,
	file: string,
): Promise<Json | undefined> => {
	if (!(await $.fs.exists(file))) {
		return {};
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(await $.fs.read(file));
	} catch {
		return undefined;
	}
	return isObject(parsed) ? parsed : undefined;
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
	const file = await settingsPath($);
	const held = await heldSettings($, file);
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
