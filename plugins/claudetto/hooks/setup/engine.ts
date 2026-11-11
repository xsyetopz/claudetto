import type { EngineInterface } from "claude-code";

import { redact } from "../secrets.ts";
import { parseSettings } from "./changes.ts";
import type { Json } from "./settings.ts";
import { recommended, SETUP_ADVICE } from "./text.ts";

const TRAILING_SLASHES = /\/+$/u;
const PROCESS_MS = 5000;
const ADVICE_MS = 20_000;

export const WRITE = "Write";
export const SKIP = "Skip";

export interface UserSettings {
	readonly dir: string;
	readonly file: string;
	readonly held: Json | undefined;
}

export async function configDir($: EngineInterface): Promise<string> {
	const config = await $.env.get("CLAUDE_CONFIG_DIR");
	return config === undefined || config === ""
		? `${await $.env.get("HOME")}/.claude`
		: config.replace(TRAILING_SLASHES, "");
}

// Claude Code keeps the login record beside `settings.json` only under `CLAUDE_CONFIG_DIR`; else it is `~/.claude.json`.
export async function loginFile($: EngineInterface): Promise<string> {
	const config = await $.env.get("CLAUDE_CONFIG_DIR");
	const base =
		config === undefined || config === ""
			? await $.env.get("HOME")
			: await configDir($);
	return `${base}/.claude.json`;
}

export async function textOf(
	$: EngineInterface,
	path: string,
): Promise<string | undefined> {
	try {
		return (await $.fs.exists(path)) ? await $.fs.read(path) : undefined;
	} catch (error) {
		$.ui.log(`The file ${path} was not read (${String(error)})`);
		return undefined;
	}
}

export async function userSettings($: EngineInterface): Promise<UserSettings> {
	const dir = await configDir($);
	const file = `${dir}/settings.json`;
	return {
		dir,
		file,
		held: parseSettings(
			(await $.fs.exists(file)) ? await $.fs.read(file) : undefined,
			(message) => {
				$.ui.log(message);
			},
		),
	};
}

export async function writeFile(
	$: EngineInterface,
	path: string,
	text: string,
): Promise<string | undefined> {
	try {
		await $.fs.write(path, text);
		return undefined;
	} catch (error) {
		return `Could not write ${path} (${String(error)}). Nothing changed.`;
	}
}

/** Haiku's pick and reason, or undefined when the scan, the call, or the answer fails; the question goes as it was then, so setup never waits on advice. */
async function adviceOf(
	$: EngineInterface,
	question: string,
	options: readonly string[],
): Promise<{ pick: string; why: string } | undefined> {
	try {
		const shown = await redact(
			(argv, init) => $.process.run(argv, init),
			question,
		);
		const r = await $.model.complete({
			model: "claude-haiku-5-5",
			effort: "low",
			prompt: SETUP_ADVICE(shown, options),
			maxTokens: 200,
			timeoutMs: ADVICE_MS,
		});
		const parsed: unknown = JSON.parse(r.isAnswered ? r.text : "");
		if (
			typeof parsed === "object" &&
			parsed !== null &&
			"pick" in parsed &&
			"why" in parsed &&
			typeof parsed.pick === "string" &&
			typeof parsed.why === "string" &&
			options.includes(parsed.pick)
		) {
			return { pick: parsed.pick, why: parsed.why };
		}
		return undefined;
	} catch (error) {
		$.ui.log(`The setup advice was not read (${String(error)})`);
		return undefined;
	}
}

/** Asks the person in the engine's dialog, with the advised option first; it rejects when the dialog is dismissed. */
export async function ask(
	$: EngineInterface,
	question: string,
	options: readonly string[],
): Promise<string> {
	const advice = await adviceOf($, question, options);
	return advice === undefined
		? $.ui.ask(question, [...options])
		: $.ui.ask(question + recommended(advice.pick, advice.why), [
				advice.pick,
				...options.filter((o) => o !== advice.pick),
			]);
}

export async function lines(
	$: EngineInterface,
	argv: readonly string[],
): Promise<string> {
	try {
		const awaited = await $.process.run(argv, { timeoutMs: PROCESS_MS });
		return awaited.stdout;
	} catch (error) {
		$.ui.log(`The ${argv[0]} call failed (${String(error)})`);
		return "";
	}
}
