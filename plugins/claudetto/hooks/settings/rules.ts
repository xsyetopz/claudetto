import type { EngineInterface } from "claude-code";

import { configDir } from "./settings";

/** Store key: each installed rule's file name mapped to the text claudetto last wrote there. */
const WRITTEN = "rules.written";

/** The folder under the plugin root that holds the rules setup installs. */
const SOURCE = "rules/laws";

type Written = Record<string, string>;

const readWritten = (value: unknown): Written =>
	typeof value === "object" && value !== null && !Array.isArray(value)
		? Object.fromEntries(
				Object.entries(value).filter(
					(entry): entry is [string, string] => typeof entry[1] === "string"
				)
			)
		: {};

/** The rule files the release ships, by name. */
async function shipped($: EngineInterface): Promise<Map<string, string>> {
	const dir = `${$.plugin.root}/${SOURCE}`;
	const entries = await $.fs.list(dir);
	const rules = entries.filter(
		(entry) => entry.kind === "file" && entry.name.endsWith(".md")
	);
	const texts = await Promise.all(
		rules.map(
			async (entry) =>
				[entry.name, await $.fs.read(`${dir}/${entry.name}`)] as const
		)
	);
	return new Map(texts);
}

/**
 * The text to write at `target`, or undefined to leave it: a missing file is
 * written on first install or a `restore` (otherwise a later absence means the user removed it),
 * and an existing file is replaced only while it still holds what claudetto wrote.
 */
async function nextText(
	$: EngineInterface,
	target: string,
	want: string,
	last: string | undefined,
	restore: boolean
): Promise<string | undefined> {
	if (!(await $.fs.exists(target))) {
		return last === undefined || restore ? want : undefined;
	}
	const current = await $.fs.read(target);
	return current !== want && current === last ? want : undefined;
}

/** `""` when a retired rule at `target` still holds the text claudetto last wrote, else undefined. */
async function retiredText(
	$: EngineInterface,
	target: string,
	last: string
): Promise<string | undefined> {
	return (await $.fs.exists(target)) && (await $.fs.read(target)) === last
		? ""
		: undefined;
}

/**
 * Installs the shipped rules into `<config>/rules/claudetto/`, where Claude Code
 * loads user rules for every project, and keeps them current across releases.
 * A rule the user edited or removed stays as they left it; a rule a release
 * retires is emptied while it holds claudetto's text, because `$.fs` has no delete.
 * `restore` writes a removed rule again, for the setup command. Returns the names written.
 */
export async function installRules(
	$: EngineInterface,
	restore = false
): Promise<string[]> {
	const dir = `${await configDir($)}/rules/claudetto`;
	const written = readWritten(await $.store.get(WRITTEN));
	const rules = await shipped($);
	const retired = Object.entries(written).filter(
		([name, last]) => !rules.has(name) && last !== ""
	);
	const plan = await Promise.all([
		...[...rules].map(async ([name, want]) => ({
			name,
			want,
			text: await nextText($, `${dir}/${name}`, want, written[name], restore)
		})),
		...retired.map(async ([name, last]) => ({
			name,
			want: undefined,
			text: await retiredText($, `${dir}/${name}`, last)
		}))
	]);
	const writes = plan.filter((step) => step.text !== undefined);
	await Promise.all(
		writes.map((step) => $.fs.write(`${dir}/${step.name}`, step.text ?? ""))
	);
	await $.store.set(
		WRITTEN,
		Object.fromEntries(
			plan.flatMap((step) =>
				step.want === undefined
					? []
					: [[step.name, step.text ?? written[step.name] ?? step.want]]
			)
		)
	);
	return writes.map((step) => step.name);
}
