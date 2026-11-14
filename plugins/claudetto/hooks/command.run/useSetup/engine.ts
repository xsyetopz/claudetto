import type { EngineInterface } from "claude-code";

import { redact } from "../../secrets";
import { parseSettings } from "./changes";
import type { Json } from "./settings";
import { recommended, SETUP_ADVICE } from "./text";

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

/** The report line for a question that was dismissed. */
export const dismissed = (what: string): string =>
	`Wrote no ${what}: the question was dismissed, or this session has no one to answer.`;

export interface Question {
	readonly text: string;
	readonly options: readonly string[];
}

interface Pick {
	readonly pick: string;
	readonly why: string;
}

/** Haiku's pick and reason for each question of a setup run, keyed by question text. */
export type Advice = ReadonlyMap<string, Pick>;

const isPick = (value: unknown): value is Pick =>
	typeof value === "object" &&
	value !== null &&
	"pick" in value &&
	"why" in value &&
	typeof value.pick === "string" &&
	typeof value.why === "string";

/** One Haiku call for every question of a setup run; a failed scan, call, or answer leaves the questions plain, so setup never waits on advice. */
export async function advise(
	$: EngineInterface,
	questions: readonly Question[],
): Promise<Advice> {
	if (questions.length === 0) {
		return new Map();
	}
	try {
		const r = await $.model.complete({
			model: "claude-haiku-5-5",
			effort: "low",
			prompt: await redact(
				(argv, init) => $.process.run(argv, init),
				SETUP_ADVICE(questions),
			),
			maxTokens: 120 * questions.length,
			timeoutMs: ADVICE_MS,
		});
		const parsed: unknown = JSON.parse(r.isAnswered ? r.text : "");
		const picks = Array.isArray(parsed) ? parsed : [];
		return new Map(
			questions.flatMap((q, i) => {
				const pick: unknown = picks[i];
				return isPick(pick) && q.options.includes(pick.pick)
					? [[q.text, pick] as const]
					: [];
			}),
		);
	} catch (error) {
		$.ui.log(`The setup advice was not read (${String(error)})`);
		return new Map();
	}
}

/** Asks the person in the engine's dialog, with the advised option first; it rejects when the dialog is dismissed. */
export function ask(
	$: EngineInterface,
	{ text, options }: Question,
	advised: Advice,
): Promise<string> {
	const advice = advised.get(text);
	return advice === undefined
		? $.ui.ask(text, [...options])
		: $.ui.ask(text + recommended(advice.pick, advice.why), [
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
