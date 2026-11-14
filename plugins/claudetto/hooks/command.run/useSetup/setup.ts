import type { EngineInterface, HookFor, On, PluginOptions } from "claude-code";

import { listOption } from "../../options";
import {
	applyChanges,
	capGroup,
	type Change,
	changesOf,
	linkGroup,
	parseSettings,
	settingsText,
	tempGroup,
	wallGroup,
} from "./changes";
import {
	type Advice,
	advise,
	ask,
	configDir,
	lines,
	loginFile,
	type Question,
	SKIP,
	textOf,
	userSettings,
	WRITE,
	writeFile,
} from "./engine";
import { keyPart, keyQuestion, lacksKey } from "./key";
import { reportRule, ruleQuestions, RULES, rulesPart } from "./rules";
import { type Group, GROUPS, type Json, STATUS_LINE } from "./settings";
import {
	ignoresOffer,
	ignoresPart,
	linkedFolders,
	purgePart,
	starterOffer,
	starterPart,
} from "./steps";
import { STATUSLINE_DESCRIPTION, statuslineEdit } from "./text";
import {
	diskLine,
	isOnPath,
	noticeKey,
	noticeLine,
	type Tool,
	toolOffer,
	toolPart,
	TOOLS,
} from "./tools";

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

const groupQuestion = (group: Group, changes: readonly Change[]): Question => ({
	text: [group.why, ...changes.map((item) => changeLine(item))].join("\n"),
	options: changes.some((change) => change.had !== undefined)
		? [FILL, REPLACE, SKIP]
		: [WRITE, SKIP],
});

/** The group's answer, or `undefined` when the question is dismissed. */
async function askGroup(
	$: EngineInterface,
	advice: Advice,
	group: Group,
	changes: readonly Change[],
): Promise<"fill" | "replace" | "skip" | undefined> {
	try {
		const answer = await ask($, groupQuestion(group, changes), advice);
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
	advice: Advice,
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
		return askGroups($, advice, rest, held, done);
	}
	const mode = await askGroup($, advice, group, changes);
	if (mode === undefined) {
		return undefined;
	}
	if (mode === "skip") {
		return askGroups($, advice, rest, held, done);
	}
	return askGroups($, advice, rest, applyChanges(held, changes, mode), [
		...done,
		group.label,
	]);
}

const DIGITS = /^\d+$/u;

/** The temp folder rules for the user's uid, or `undefined` when `id -u` prints no number. */
async function tempGroupOf($: EngineInterface): Promise<Group | undefined> {
	const printed = await lines($, ["id", "-u"]);
	const uid = printed.trim();
	return DIGITS.test(uid) ? tempGroup(uid) : undefined;
}

async function groupsOf(
	$: EngineInterface,
	walls: readonly string[],
): Promise<Group[]> {
	const extra = [
		capGroup(
			parseSettings(await textOf($, await loginFile($)), (message) => {
				$.ui.log(message);
			}),
		),
		wallGroup(walls),
		linkGroup(await linkedFolders($)),
		await tempGroupOf($),
	].filter((group) => group !== undefined);
	return [...GROUPS, ...extra];
}

async function settingsPart(
	$: EngineInterface,
	walls: readonly string[],
	advice: Advice,
): Promise<string> {
	const { dir, file, held } = await userSettings($);
	if (held === undefined) {
		return `${file} could not be read as a JSON object, so nothing was written. Fix the file and run /${SETUP} again.`;
	}
	const result = await askGroups($, advice, await groupsOf($, walls), held, []);
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
	return [report, await rulesPart($, dir, advice)].join("\n");
}

/** Every question a setup run can ask, as the settings stand before it, so Haiku advises them all in one call. */
async function questionsOf(
	$: EngineInterface,
	walls: readonly string[],
): Promise<Question[]> {
	const { dir, file, held } = await userSettings($);
	const groups = held === undefined ? [] : await groupsOf($, walls);
	const asked = groups.flatMap((group) => {
		const changes = held === undefined ? [] : changesOf(held, group);
		return changes.length === 0 ? [] : [groupQuestion(group, changes)];
	});
	const [starter, ignores, tools] = [
		await starterOffer($),
		await ignoresOffer($),
		await Promise.all(TOOLS.map((tool) => toolOffer($, tool))),
	];
	const offers = [
		lacksKey(held) ? keyQuestion(file) : undefined,
		starter?.question,
		ignores?.question,
		...tools.map((offer) =>
			offer !== undefined && "question" in offer ? offer.question : undefined,
		),
	];
	return [
		...asked,
		...(await ruleQuestions($, dir)),
		...offers.filter((question) => question !== undefined),
	];
}

async function onSetup(
	$: EngineInterface,
	walls: readonly string[],
): Promise<{ text: string }> {
	const advice = await advise($, await questionsOf($, walls));
	const parts = [
		await settingsPart($, walls, advice),
		await keyPart($, advice),
		await starterPart($, advice),
		await ignoresPart($, advice),
		...(await Promise.all(TOOLS.map((tool) => toolPart($, tool, advice)))),
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

/** The missing-tool notice only logs, so it does not reach the model. */
const onStartup: HookFor<"classic.SessionStart"> = async ($, e, next) => {
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
