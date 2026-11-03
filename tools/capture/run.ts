#!/usr/bin/env bun

import { mkdir } from "node:fs/promises";
import { isAbsolute, normalize } from "node:path";
import { argv } from "node:process";
import { file as bunFile } from "bun";
import type { ToolCall } from "../../claudekit/api/answer.ts";
import { count } from "../../plugins/claudetto/src/format.ts";
import { ARMS, type Arm, capture, PROMPT } from "./arm.ts";
import type { Score } from "./score.ts";
import { denySettings, shippedSettings } from "./settings.ts";

const argOf = (args: readonly string[], name: string): string | undefined => {
	const at = args.indexOf(`--${name}`);
	return at >= 0 ? args[at + 1] : undefined;
};

/** `--strict-mcp-config` keeps the login's own servers out of the reading. */
export const extraArgs = (args: readonly string[]): string[] => {
	const mcp = argOf(args, "mcp-config");
	const plugin = argOf(args, "plugin-dir");
	return [
		...(mcp === undefined ? [] : ["--mcp-config", mcp, "--strict-mcp-config"]),
		...(plugin === undefined ? [] : ["--plugin-dir", plugin]),
		...(args.includes("--classifier") ? ["--permission-mode", "auto"] : []),
	];
};

/** The size of the `CLAUDE.md` that `--FLAG` asks for, or `undefined` when the flag is absent. */
export const claudeMdChars = (
	args: readonly string[],
	flag: "claude-md" | "user-claude-md" = "claude-md",
): number | undefined => {
	if (!args.includes(`--${flag}`)) {
		return undefined;
	}
	const chars = Number(argOf(args, flag));
	if (!Number.isInteger(chars) || chars < 0) {
		throw new Error(`--${flag} takes a count of characters, such as 2000`);
	}
	return chars;
};

export interface UserFile {
	/** Relative to the config folder, where a user's `~/.claude` is read. */
	readonly path: string;
	readonly source: string;
}

/** Each `--user-file PATH=SOURCE`, in order; a path that leaves the config folder is refused. */
export const userFilesOf = (args: readonly string[]): UserFile[] =>
	args.flatMap((arg, at) => {
		if (arg !== "--user-file") {
			return [];
		}
		const [path, source] = (args[at + 1] ?? "").split("=", 2);
		if (
			!path ||
			!source ||
			isAbsolute(path) ||
			normalize(path).startsWith("..")
		) {
			throw new Error(
				"--user-file takes PATH=SOURCE, with PATH inside the config folder, such as rules/a.md=/tmp/a.md",
			);
		}
		return [{ path, source }];
	});

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const isCall = (value: unknown): value is ToolCall =>
	isRecord(value) &&
	typeof value["name"] === "string" &&
	isRecord(value["input"]);

/** The calls of a `--calls` file, refused whole when one entry is not a call. */
export const callsOf = (text: string): ToolCall[] => {
	const parsed: unknown = JSON.parse(text);
	if (!Array.isArray(parsed) || !parsed.every(isCall)) {
		throw new Error("--calls takes a JSON list of { name, input } objects");
	}
	return parsed;
};

const USAGE = `Usage: just capture [--arm plain|plugin] [--shipped | --deny A,B | --settings FILE]
  [--mcp-config FILE] [--plugin-dir DIR] [--tools N] [--dump DIR] [--prompt TEXT]
  [--classifier] [--interactive] [--calls FILE] [--claude-md CHARS] [--user-claude-md CHARS]
  [--user-file PATH=SOURCE]...

--interactive runs each arm in a detached \`tmux\` session with no \`-p\`, so the request
holds the tools of an interactive session. It needs \`tmux\` on the PATH.
--classifier reads the auto mode classifier request in place of the first request.
Its last system block holds the login name, so it differs between logins.
--calls FILE makes the fake answer with each tool call of the JSON list in turn, then "ok".
--claude-md CHARS puts a \`CLAUDE.md\` of that many characters in the working folder, so the
request shows what a memory file costs. Without it the folder is empty.
--user-claude-md CHARS puts one in the config folder, where a user's \`~/.claude/CLAUDE.md\` is read.
--user-file PATH=SOURCE copies SOURCE to PATH in the config folder, such as rules/a.md=/tmp/a.md.
With --dump each later request is written too, as ARM.1.json, ARM.2.json, and so on.`;

const settingsOf = async (options: {
	file: string | undefined;
	deny: string | undefined;
	shipped: boolean;
}): Promise<string | undefined> => {
	if (options.shipped) {
		return shippedSettings();
	}
	if (options.deny !== undefined) {
		return denySettings(options.deny.split(","));
	}
	return options.file === undefined
		? undefined
		: await bunFile(options.file).text();
};

const row = (arm: Arm, score: Score): void => {
	console.info(
		`  ${arm.padEnd(6)} | total ${count(score.total).padStart(7)} | system ${count(score.system).padStart(7)} | tools ${count(score.tools).padStart(7)} (${score.toolCount}) | messages ${count(score.messages).padStart(6)}`,
	);
};

const intro = (interactive: boolean, settings: string | undefined): void => {
	console.info(
		`Each arm runs \`${interactive ? "claude" : "claude -p"}\` against a fake Messages API on 127.0.0.1. No provider is reached.`,
	);
	console.info(`Settings of each run: ${settings ?? "the defaults"}`);
};

const main = async (): Promise<void> => {
	const args = argv.slice(2);
	if (args.includes("--help")) {
		console.info(USAGE);
		return;
	}
	const only = argOf(args, "arm");
	const file = argOf(args, "settings");
	const deny = argOf(args, "deny");
	const settings = await settingsOf({
		file,
		deny,
		shipped: args.includes("--shipped"),
	});
	const tools = Number(argOf(args, "tools") ?? 0);
	const arms = ARMS.filter((arm) => only === undefined || only === arm);
	if (arms.length === 0) {
		console.error(`--arm takes one of ${ARMS.join(", ")}`);
		process.exitCode = 1;
		return;
	}
	const interactive = args.includes("--interactive");
	intro(interactive, settings);
	const dump = argOf(args, "dump");
	const prompt = argOf(args, "prompt") ?? PROMPT;
	const callsFile = argOf(args, "calls");
	const calls =
		callsFile === undefined
			? undefined
			: callsOf(await bunFile(callsFile).text());
	const claudeMd = claudeMdChars(args);
	const userClaudeMd = claudeMdChars(args, "user-claude-md");
	const userFiles = await Promise.all(
		userFilesOf(args).map(async ({ path, source }) => ({
			path,
			text: await bunFile(source).text(),
		})),
	);
	if (dump !== undefined) {
		await mkdir(dump, { recursive: true });
	}
	const readings = await Promise.all(
		arms.map((arm) =>
			capture(arm, settings, {
				dump,
				prompt,
				extra: extraArgs(args),
				classifier: args.includes("--classifier"),
				interactive,
				calls,
				claudeMd,
				userClaudeMd,
				userFiles,
			}),
		),
	);
	console.info(
		`\nThe characters of the ${args.includes("--classifier") ? "classifier" : "first"} request:`,
	);
	for (const reading of readings) {
		if (reading.score === undefined) {
			console.error(
				`  ${reading.arm}: no request was sent (exit ${reading.code}). ${reading.stderr}`,
			);
			process.exitCode = 1;
			continue;
		}
		row(reading.arm, reading.score);
	}
	for (const reading of readings) {
		if (reading.score === undefined) {
			continue;
		}
		console.info(
			`\n  ${reading.arm}: ${reading.requests} request(s) to the messages route, ${reading.others} to another route, working folder path ${reading.workChars} chars`,
		);
		console.info(
			`  ${reading.arm}: system blocks ${reading.score.blocks.join(", ")}`,
		);
		for (const tool of reading.score.perTool.slice(0, tools)) {
			console.info(
				`  ${reading.arm}: tool ${tool.name} ${count(tool.chars)}, description ${count(tool.desc)}`,
			);
		}
	}
};

if (import.meta.main) {
	await main();
}
