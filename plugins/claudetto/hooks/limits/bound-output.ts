import type { EngineInterface, PluginOptions } from "claude-code";

import type { CallAnswer, CallEvent, CallNext } from "../chain.ts";
import { parse, programOf } from "../gate/shell-words.ts";
import { atRoot } from "../handoff/layout.ts";
import { numberOption } from "../options.ts";
import { isRecord } from "../tools.ts";

const HEAD_SHARE = 0.4;

const TAIL_SHARE = 0.4;

/** Runner output puts its banner at the head and its summary at the tail. */
const boundText = (
	text: string,
	limit: number,
	saved: string | undefined,
): string => {
	if (limit <= 0 || text.length <= limit) {
		return text;
	}
	const head = Math.floor(limit * HEAD_SHARE);
	const tail = Math.floor(limit * TAIL_SHARE);
	const cut = text.length - head - tail;
	return [
		text.slice(0, head),
		saved === undefined
			? `[claudetto: cut ${cut} characters; the full output could not be saved]`
			: `[claudetto: cut ${cut} characters; the full output is in \`${saved}\`]`,
		text.slice(text.length - tail),
	].join("\n");
};

/** A runner by program: the subcommands that start a run, or `true` when every call does. Chosen runners; subcommands read from each tool's help. */
const RUNNERS: Readonly<Record<string, readonly string[] | true>> = {
	bun: ["test", "build", "lint", "check", "typecheck"],
	just: ["check", "test", "lint", "build", "typecheck"],
	cargo: ["test", "build", "check", "clippy", "nextest"],
	go: ["test", "build", "vet"],
	pytest: true,
	npm: ["test", "build", "lint"],
	pnpm: ["test", "build", "lint"],
	yarn: ["test", "build", "lint"],
	make: true,
	tsc: true,
	swift: ["build", "test"],
	xcodebuild: true,
	gradle: true,
	gradlew: true,
	mvn: true,
};

const isRun = (program: string, args: readonly string[]): boolean => {
	const subcommand = args[0] === "run" ? args[1] : args[0];
	const runner = RUNNERS[program];
	return runner === true || runner?.includes(subcommand ?? "") === true;
};

/** True when a command of the line starts a test, build, lint, or check run; an `echo bun test` is no run. */
const isBoundedRun = (command: string): boolean =>
	parse(command).commands.some((c) => {
		const { name, args } = programOf(c);
		return isRun(name, args);
	});

export const BOUND_OUTPUT_DIR = ".claude/claudetto/output";

/** Room for a runner's banner, its summary, and a few failures. */
const DEFAULT_OUTPUT_CHARS = 8000;

const STREAMS = ["stdout", "stderr"] as const;

/** The whole text a result carries, which is what the file holds. */
const fullTextOf = (result: unknown): string | undefined => {
	if (typeof result === "string") {
		return result;
	}
	const parts = isRecord(result)
		? STREAMS.flatMap((name) => {
				const text = result[name];
				return typeof text === "string" ? text : [];
			})
		: [];
	return parts.length === 0 ? undefined : parts.join("\n");
};

/** Cuts each stream alone, so a long `stdout` does not take the room of a short `stderr`; every other field keeps its value. */
const boundResult = (
	result: unknown,
	limit: number,
	saved?: string,
): unknown => {
	// A failed run reaches here as a string; the engine accepts a changed Bash result only in the object shape.
	if (typeof result === "string") {
		return {
			stdout: boundText(result, limit, saved),
			stderr: "",
			interrupted: false,
		};
	}
	if (!isRecord(result)) {
		return result;
	}
	const cut: Record<string, unknown> = { ...result };
	for (const name of STREAMS) {
		const text = result[name];
		if (typeof text === "string") {
			cut[name] = boundText(text, limit, saved);
		}
	}
	return cut;
};

/** A file that cannot be written leaves the cut in place and says so in its marker. */
async function save(
	$: EngineInterface,
	path: string,
	text: string,
): Promise<string | undefined> {
	try {
		await $.fs.write(atRoot(await $.session.root(), path), text);
		return path;
	} catch {
		return undefined;
	}
}

/** Cuts the output of a Bash test, build, lint, or check run to the `maxTestOutputChars` limit and saves the full text to a file. */
export async function boundOutputCall(
	$: EngineInterface,
	e: CallEvent,
	next: CallNext,
	options: PluginOptions,
): Promise<Awaited<CallAnswer>> {
	if (e.tool !== "Bash") {
		return next(e);
	}
	// `0` is off.
	const limit = numberOption(
		options,
		"maxTestOutputChars",
		DEFAULT_OUTPUT_CHARS,
		0,
	);
	const answer = await next(e);
	if (limit === 0 || answer.deny !== undefined || !isBoundedRun(e.command)) {
		return answer;
	}
	const full = fullTextOf(answer.result);
	// Streams that each fit are left whole, whatever they total.
	if (
		full === undefined ||
		full.length <= limit ||
		JSON.stringify(boundResult(answer.result, limit)) ===
			JSON.stringify(answer.result)
	) {
		return answer;
	}
	const path = `${BOUND_OUTPUT_DIR}/output-${e.tool_use_id.replaceAll(/[^\w-]/gu, "_")}.txt`;
	const saved = await save($, path, full);
	return {
		...answer,
		result: boundResult(answer.result, limit, saved),
		...(answer.text === undefined
			? {}
			: { text: boundText(answer.text, limit, saved) }),
	};
}
