// The setup and `/statusline` commands and the session start check share these `$` helpers: the hook loader takes `$` into a helper only within the file that defines it.

import type {
	EngineInterface,
	HookFor,
	On,
	PluginOptions,
} from "claude-code";
import { listOption } from "./options.ts";
import {
	applyChanges,
	type Change,
	capGroup,
	changesOf,
	GROUPS,
	type Group,
	type Json,
	MINIMUM_VERSION,
	parseSettings,
	STATUS_LINE,
	settingsText,
	wallGroup,
	withCacheDirs,
} from "./setup/settings.ts";
import { linesOf } from "./setup/starter.ts";
import {
	type Io,
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
	TOOLS,
	type Tool,
} from "./setup/tools.ts";

const TRAILING_SLASHES = /\/+$/;
const SETUP = "claudetto:setup";
const STATUSLINE = "statusline";
const RULES = [
	"useLeastCode",
	"noUnrequestedEdits",
	"noImpossibleStateGuards",
	"useEdgeCaseReport",
	"noNarratingComments",
];
const PROCESS_MS = 5000;
const INSTALL_MS = 600_000;
const FILL = "Fill unset";
const REPLACE = "Replace mine too";
const WRITE = "Write";
const SKIP = "Skip";

interface UserSettings {
	readonly dir: string;
	readonly file: string;
	readonly held: Json | undefined;
}

const configDir = async ($: EngineInterface): Promise<string> => {
	const config = await $.env.get("CLAUDE_CONFIG_DIR");
	return config === undefined || config === ""
		? `${await $.env.get("HOME")}/.claude`
		: config.replace(TRAILING_SLASHES, "");
};

// Claude Code keeps the login record beside `settings.json` only under `CLAUDE_CONFIG_DIR`; else it is `~/.claude.json`.
const loginFile = async ($: EngineInterface): Promise<string> =>
	`${(await $.env.get("CLAUDE_CONFIG_DIR")) ? await configDir($) : await $.env.get("HOME")}/.claude.json`;

const userSettings = async ($: EngineInterface): Promise<UserSettings> => {
	const dir = await configDir($);
	const file = `${dir}/settings.json`;
	return {
		dir,
		file,
		held: parseSettings(
			(await $.fs.exists(file)) ? await $.fs.read(file) : undefined,
		),
	};
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

const writeFile = async (
	$: EngineInterface,
	path: string,
	text: string,
): Promise<string | undefined> => {
	try {
		await $.fs.write(path, text);
		return undefined;
	} catch (error) {
		return `Could not write ${path} (${String(error)}). Nothing changed.`;
	}
};

const ANSWERED = "The user answered: ";

/** The stock dialog is denied outside `mcp__claudetto__ask-user-question`, so a question goes through that tool; it rejects when the dialog is dismissed. */
const ask = async (
	$: EngineInterface,
	question: string,
	options: readonly string[],
): Promise<string> => {
	const out = await $.tool.call({
		tool: "mcp__claudetto__ask-user-question",
		question,
		options,
	});
	const result = typeof out.result === "string" ? out.result : "";
	if (!result.startsWith(ANSWERED)) {
		throw new Error(out.deny ?? result);
	}
	return result.slice(ANSWERED.length);
};

const lines = async (
	$: EngineInterface,
	argv: readonly string[],
): Promise<string> => {
	try {
		return (await $.process.run(argv, { timeoutMs: PROCESS_MS })).stdout;
	} catch {
		return "";
	}
};

const ioOf = ($: EngineInterface): Io => ({
	cwd: async () => await $.session.cwd(),
	git: async (args) =>
		linesOf(await lines($, ["git", "-C", await $.session.cwd(), ...args])),
	exists: async (path) => await $.fs.exists(path),
	read: async (path) => await $.fs.read(path),
	write: async (path, text) => {
		await $.fs.write(path, text);
	},
	ask: async (question, _header, options) => await ask($, question, options),
	path: async () => await $.env.get("PATH"),
	home: async () => (await $.env.get("HOME")) ?? "",
	decline: async (key) => {
		await $.store.set(key, true);
	},
	run: async (argv) => {
		const result = await $.process.run(argv, { timeoutMs: INSTALL_MS });
		return {
			exitCode: result.exitCode,
			text: result.exitCode === 0 ? result.stdout : result.stderr,
		};
	},
});

const shown = (value: unknown): string => {
	const text = JSON.stringify(value) ?? "unset";
	return text.length > 80 ? `${text.slice(0, 80)}...` : text;
};

const changeLine = (change: Change): string =>
	`- ${change.path}: ${change.had === undefined ? "unset" : `yours ${shown(change.had)}`}, claudetto ${shown(change.wanted)}`;

/** The group's answer, or `undefined` when the question is dismissed. */
const askGroup = async (
	$: EngineInterface,
	group: Group,
	changes: readonly Change[],
): Promise<"fill" | "replace" | "skip" | undefined> => {
	const mine = changes.some((change) => change.had !== undefined);
	try {
		const answer = await ask(
			$,
			[group.why, ...changes.map(changeLine)].join("\n"),
			mine ? [FILL, REPLACE, SKIP] : [WRITE, SKIP],
		);
		if (answer.trim() === SKIP) {
			return "skip";
		}
		return answer.trim() === REPLACE ? "replace" : "fill";
	} catch {
		return undefined;
	}
};

const askGroups = async (
	$: EngineInterface,
	groups: readonly Group[],
	held: Json,
	done: readonly string[],
): Promise<{ settings: Json; written: readonly string[] } | undefined> => {
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
};

// Each name is a literal, because `$.env.get` reads the names off the source. A variable set to a folder moves that tool's cache out of the Sandbox group's fixed list.
const cacheDirs = async ($: EngineInterface): Promise<string[]> =>
	(
		await Promise.all([
			$.env.get("BUN_INSTALL_CACHE_DIR"),
			$.env.get("npm_config_cache"),
			$.env.get("PIP_CACHE_DIR"),
			$.env.get("GOMODCACHE"),
			$.env.get("GOCACHE"),
			$.env.get("XDG_CACHE_HOME"),
		])
	).filter((dir): dir is string => dir !== undefined && dir !== "");

const settingsPart = async (
	$: EngineInterface,
	walls: readonly string[],
): Promise<string> => {
	const { dir, file, held } = await userSettings($);
	if (held === undefined) {
		return `${file} could not be read as a JSON object, so nothing was written. Fix the file and run /${SETUP} again.`;
	}
	const extra = [
		capGroup(parseSettings(await textOf($, await loginFile($)))),
		wallGroup(walls),
	].filter((group) => group !== undefined);
	const result = await askGroups(
		$,
		withCacheDirs([...GROUPS, ...extra], await cacheDirs($)),
		held,
		[],
	);
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
};

const KEY_NAME = "CONTEXT7_API_KEY";
const NO_KEY = "I have no key";

const keyGroup = (key: string): Group => ({
	label: KEY_NAME,
	why: "",
	settings: { env: { [KEY_NAME]: key } },
});

/** The key is typed under the dialog's own-answer entry and goes only into settings `env`, which the session's `Bash` inherits; the report never repeats it. */
const keyPart = async ($: EngineInterface): Promise<string | undefined> => {
	const { file, held } = await userSettings($);
	if (
		held === undefined ||
		changesOf(held, keyGroup("")).some((change) => change.had !== undefined)
	) {
		return undefined;
	}
	let answer: string;
	try {
		answer = (
			await ask(
				$,
				`Context7 API key for \`bunx ctx7\`: type it as your own answer, or skip. It is written to ${file} under env.${KEY_NAME}.`,
				[SKIP, NO_KEY],
			)
		).trim();
	} catch {
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
};

const hashKey = (name: string) => `rules:${name}:hash`;
const seenKey = (name: string) => `rules:${name}:reported`;

const sha256 = async (text: string): Promise<string> =>
	Array.from(
		new Uint8Array(
			await crypto.subtle.digest(
				"SHA-256",
				new TextEncoder().encode(text).slice(),
			),
		),
		(byte) => byte.toString(16).padStart(2, "0"),
	).join("");

const DISMISSED = "Wrote no further rules: the question was dismissed.";

/** The line for one rule, or `undefined` when the user holds it as shipped. */
const offerRule = async (
	$: EngineInterface,
	dir: string,
	name: string,
): Promise<string | undefined> => {
	const shipped = await textOf($, `${$.plugin.root}/rules/${name}.md`);
	const path = `${dir}/rules/claudetto/${name}.md`;
	if (shipped === undefined || shipped === (await textOf($, path))) {
		return undefined;
	}
	try {
		const answer = await ask(
			$,
			`Copy the ${name} rule to ${path}? A session loads it after its first file read.\n\n${shipped.slice(shipped.indexOf("\n---\n") + 5).trim()}`,
			[WRITE, SKIP],
		);
		if (answer.trim() !== WRITE) {
			return `Skipped the ${name} rule.`;
		}
		const failed = await writeFile($, path, shipped);
		if (failed === undefined) {
			await $.store.set(hashKey(name), await sha256(shipped));
		}
		return failed ?? `Wrote ${path}.`;
	} catch {
		return DISMISSED;
	}
};

/** One dialog per rule the user lacks or holds in another form; a dismissed one ends the rest, as nobody is there to answer. */
const rulesPart = async ($: EngineInterface, dir: string): Promise<string> => {
	const report: string[] = [];
	for (const name of RULES) {
		const line = await offerRule($, dir, name);
		if (line !== undefined) {
			report.push(line);
		}
		if (line === DISMISSED) {
			break;
		}
	}
	return report.length === 0
		? "The code rules are up to date."
		: report.join("\n");
};

const dayOf = async ($: EngineInterface, path: string): Promise<string> =>
	new Date((await $.fs.stat(path)).mtimeMs).toISOString().slice(0, 10);

/** The saved hash decides updated or modified, not the dates: a plugin install likely stamps every shipped file anew. */
const reportRule = async (
	$: EngineInterface,
	dir: string,
	name: string,
): Promise<void> => {
	const from = `${$.plugin.root}/rules/${name}.md`;
	const path = `${dir}/rules/claudetto/${name}.md`;
	const [shipped, held] = [await textOf($, from), await textOf($, path)];
	if (shipped === undefined || held === undefined) {
		return;
	}
	const [shippedHash, heldHash] = [await sha256(shipped), await sha256(held)];
	const pair = `${shippedHash}:${heldHash}`;
	if (shippedHash === heldHash || (await $.store.get(seenKey(name))) === pair) {
		return;
	}
	const kind =
		(await $.store.get(hashKey(name))) === heldHash ? "updated" : "modified";
	$.ui.log(
		`The ${name} rule is ${kind}: shipped ${shippedHash.slice(0, 8)} (${await dayOf($, from)}), installed ${heldHash.slice(0, 8)} (${await dayOf($, path)}). Run /${SETUP}.`,
	);
	await $.store.set(seenKey(name), pair);
};

const onSetup = async (
	$: EngineInterface,
	walls: readonly string[],
): Promise<{ text: string }> => {
	const io = ioOf($);
	const parts = [
		await settingsPart($, walls),
		await keyPart($),
		await starterPart(io),
		await ignoresPart(io),
		...(await Promise.all(TOOLS.map((tool) => toolPart(io, tool)))),
		await purgePart(io),
	].filter((part) => part !== undefined);
	return { text: parts.join("\n") };
};

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
const toolNotice = async (
	$: Parameters<HookFor<"classic.SessionStart">>[0],
	tool: Tool,
	path: string | undefined,
): Promise<void> => {
	const exists = (file: string) => $.fs.exists(file);
	const quiet =
		!tool.required && (await $.store.get(noticeKey(tool))) === true;
	if (quiet || (await isOnPath(tool.name, path, exists))) {
		return;
	}
	$.ui.log(noticeLine(tool, await isOnPath("brew", path, exists)));
	if (!tool.required) {
		await $.store.set(noticeKey(tool), true);
	}
};

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
	await Promise.all(RULES.map((name) => reportRule($, dir, name)));
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
