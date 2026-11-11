import type { EngineInterface, HookFor, On, PluginOptions } from "claude-code";

import { listOption } from "./options.ts";
import {
	applyChanges,
	capGroup,
	type Change,
	changesOf,
	parseSettings,
	settingsText,
	wallGroup,
} from "./setup/changes.ts";
import {
	ask,
	configDir,
	lines,
	loginFile,
	SKIP,
	textOf,
	userSettings,
	WRITE,
	writeFile,
} from "./setup/engine.ts";
import { reportRule, RULES, rulesPart } from "./setup/rules.ts";
import {
	type Group,
	GROUPS,
	type Json,
	MINIMUM_VERSION,
	STATUS_LINE,
} from "./setup/settings.ts";
import {
	ignoresPart,
	purgePart,
	starterPart,
	toolPart,
} from "./setup/steps.ts";
import { STATUSLINE_DESCRIPTION, statuslineEdit } from "./setup/text.ts";
import {
	diskLine,
	isBelowFloor,
	isOnPath,
	noticeKey,
	noticeLine,
	type Tool,
	TOOLS,
} from "./setup/tools.ts";

const SETUP = "claudetto:setup";
const STATUSLINE = "statusline";
const FILL = "Fill unset";
const REPLACE = "Replace mine too";

const shown = (value: unknown): string => {
	const text = JSON.stringify(value) ?? "unset";
	return text.length > 80 ? `${text.slice(0, 80)}...` : text;
};

const changeLine = (change: Change): string =>
	`- ${change.path}: ${change.had === undefined ? "unset" : `yours ${shown(change.had)}`}, claudetto ${shown(change.wanted)}`;

/** The group's answer, or `undefined` when the question is dismissed. */
async function askGroup(
	$: EngineInterface,
	group: Group,
	changes: readonly Change[],
): Promise<"fill" | "replace" | "skip" | undefined> {
	const mine = changes.some((change) => change.had !== undefined);
	try {
		const answer = await ask(
			$,
			[group.why, ...changes.map((item) => changeLine(item))].join("\n"),
			mine ? [FILL, REPLACE, SKIP] : [WRITE, SKIP],
		);
		if (answer.trim() === SKIP) {
			return "skip";
		}
		return answer.trim() === REPLACE ? "replace" : "fill";
	} catch (error) {
		$.ui.log(`The setup question was not answered (${String(error)})`);
		return undefined;
	}
}

async function askGroups(
	$: EngineInterface,
	groups: readonly Group[],
	held: Json,
	done: readonly string[],
): Promise<{ settings: Json; written: readonly string[] } | undefined> {
	const [group, ...rest] = groups;
	if (group === undefined) {
		return { settings: held, written: done };
	}
	const changes = changesOf(held, group);
	if (changes.length === 0) {
		return askGroups($, rest, held, done);
	}
	const mode = await askGroup($, group, changes);
	if (mode === undefined) {
		return undefined;
	}
	if (mode === "skip") {
		return askGroups($, rest, held, done);
	}
	return askGroups($, rest, applyChanges(held, changes, mode), [
		...done,
		group.label,
	]);
}

async function settingsPart(
	$: EngineInterface,
	walls: readonly string[],
): Promise<string> {
	const { dir, file, held } = await userSettings($);
	if (held === undefined) {
		return `${file} could not be read as a JSON object, so nothing was written. Fix the file and run /${SETUP} again.`;
	}
	const extra = [
		capGroup(
			parseSettings(await textOf($, await loginFile($)), (message) => {
				$.ui.log(message);
			}),
		),
		wallGroup(walls),
	].filter((group) => group !== undefined);
	const result = await askGroups($, [...GROUPS, ...extra], held, []);
	if (result === undefined) {
		return `Nothing was written: a question was dismissed, or this session has no one to answer. ${file} was not changed.`;
	}
	const failed =
		result.written.length === 0
			? undefined
			: await writeFile($, file, settingsText(result.settings));
	const report =
		failed ??
		(result.written.length === 0
			? `${file} was not changed.`
			: `Wrote ${result.written.join(", ")} to ${file}. Restart Claude Code: the keys are read when it starts.`);
	return [report, await rulesPart($, dir)].join("\n");
}

const KEY_NAME = "CONTEXT7_API_KEY";
const NO_KEY = "I have no key";

const keyGroup = (key: string): Group => ({
	label: KEY_NAME,
	why: "",
	settings: { env: { [KEY_NAME]: key } },
});

/** The key is typed under the dialog's own-answer entry and goes only into settings `env`, which the session's `Bash` inherits; the report never repeats it. */
async function keyPart($: EngineInterface): Promise<string | undefined> {
	const { file, held } = await userSettings($);
	if (
		held === undefined ||
		changesOf(held, keyGroup("")).some((change) => change.had !== undefined)
	) {
		return undefined;
	}
	let answer: string;
	try {
		const awaited2 = await ask(
			$,
			`Context7 API key for \`bunx ctx7\`: type it as your own answer, or skip. It is written to ${file} under env.${KEY_NAME}.`,
			[SKIP, NO_KEY],
		);
		answer = awaited2.trim();
	} catch (error) {
		$.ui.log(`The Context7 key question was not answered (${String(error)})`);
		return undefined;
	}
	if (answer === "" || answer === SKIP || answer === NO_KEY) {
		return undefined;
	}
	const failed = await writeFile(
		$,
		file,
		settingsText(applyChanges(held, changesOf(held, keyGroup(answer)), "fill")),
	);
	return failed ?? `Wrote env.${KEY_NAME} to ${file}. Restart Claude Code.`;
}

async function onSetup(
	$: EngineInterface,
	walls: readonly string[],
): Promise<{ text: string }> {
	const parts = [
		await settingsPart($, walls),
		await keyPart($),
		await starterPart($),
		await ignoresPart($),
		...(await Promise.all(TOOLS.map((tool) => toolPart($, tool)))),
		await purgePart($),
	].filter((part) => part !== undefined);
	return { text: parts.join("\n") };
}

/** Bare `/statusline` writes claudetto's line; with text the built-in command goes on to its prompt, which `skill.prompt` rewrites. */
const onStatusline: HookFor<"command.run"> = async ($, e, next) => {
	if (e.args.trim() !== "") {
		return next(e);
	}
	const { file, held } = await userSettings($);
	if (held === undefined) {
		return {
			text: `${file} could not be read as a JSON object, so nothing was written. Fix the file and run /${STATUSLINE} again.`,
		};
	}
	const changes = changesOf(held, STATUS_LINE);
	if (changes.length === 0) {
		return { text: `${file} already holds claudetto's status line.` };
	}
	if (changes.some((change) => change.had !== undefined)) {
		return {
			text: `Your own statusLine in ${file} stays as it is. Run /${STATUSLINE} with a request to change it.`,
		};
	}
	const failed = await writeFile(
		$,
		file,
		settingsText(applyChanges(held, changes, "fill")),
	);
	return { text: failed ?? `Wrote ${file}.` };
};

const onStatuslinePrompt: HookFor<"skill.prompt"> = async ($, e, next) =>
	e.source === "built-in"
		? { text: statuslineEdit(e.text, `${await configDir($)}/settings.json`) }
		: next(e);

/** A missing tool's launch notice; an optional one's stays quiet once shown. */
async function toolNotice(
	$: Parameters<HookFor<"classic.SessionStart">>[0],
	tool: Tool,
	path: string | undefined,
): Promise<void> {
	const exists = (file: string) => $.fs.exists(file);
	const quiet = !tool.required && (await $.store.get(noticeKey(tool))) === true;
	if (quiet || (await isOnPath(tool.name, path, exists))) {
		return;
	}
	$.ui.log(noticeLine(tool, await isOnPath("brew", path, exists)));
	if (!tool.required) {
		await $.store.set(noticeKey(tool), true);
	}
}

/** The version floor and the missing-tool notice only log, so neither reaches the model. */
const onStartup: HookFor<"classic.SessionStart"> = async ($, e, next) => {
	const { base } = await $.session.version();
	if (base !== undefined && isBelowFloor(base, MINIMUM_VERSION)) {
		$.ui.log(
			`claudetto needs Claude Code ${MINIMUM_VERSION} or later, and this session runs ${base}. Run \`claude update\`.`,
		);
	}
	const path = await $.env.get("PATH");
	await Promise.all(TOOLS.map((tool) => toolNotice($, tool, path)));
	const disk = diskLine(await lines($, ["df", "-Pk", "."]));
	if (disk !== undefined) {
		$.ui.log(disk);
	}
	const dir = await configDir($);
	await Promise.all(RULES.map((name) => reportRule($, dir, name, SETUP)));
	return next(e);
};

export const setup = (on: On, options: PluginOptions): void => {
	const walls = listOption(options, "protectedPaths");
	on("command.run", { command: SETUP }, ($) => onSetup($, walls));
	on("command.run", { command: STATUSLINE }, onStatusline);
	on("command.describe", { command: STATUSLINE }, (_$, e, next) =>
		next({ ...e, description: STATUSLINE_DESCRIPTION }),
	);
	on("skill.prompt", { skill: STATUSLINE }, onStatuslinePrompt);
	on("classic.SessionStart", { source: "startup" }, onStartup);
};
