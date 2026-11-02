// The pure parts of the probe: its arguments, its settings, and the reading of the second request.

import { fieldOf } from "../api/json.ts";

export interface Args {
	readonly command: string;
	/** Inline settings JSON from `--settings`. */
	readonly settings?: string;
	/** A settings JSON file, the second bare word. */
	readonly file?: string;
	/** A `PreToolUse` hook command for `Bash`. */
	readonly hook?: string;
}

const FLAGS = ["--settings", "--hook"] as const;

/** `COMMAND [FILE] [--settings JSON] [--hook COMMAND]`. Throws on a missing command or flag value. */
export const parseArgs = (argv: readonly string[]): Args => {
	const words: string[] = [];
	const flags: Record<string, string> = {};
	for (let i = 0; i < argv.length; i++) {
		const word = argv[i] ?? "";
		const flag = FLAGS.find((f) => f === word);
		if (flag === undefined) {
			words.push(word);
			continue;
		}
		const value = argv[++i];
		if (value === undefined) {
			throw new Error(`\`${flag}\` needs a value`);
		}
		flags[flag] = value;
	}
	const [command, file] = words;
	if (command === undefined) {
		throw new Error(
			"a `COMMAND` is required: bash-once COMMAND [FILE] [--settings JSON] [--hook COMMAND]",
		);
	}
	return {
		command,
		...(file === undefined ? {} : { file }),
		...(flags["--settings"] === undefined
			? {}
			: { settings: flags["--settings"] }),
		...(flags["--hook"] === undefined ? {} : { hook: flags["--hook"] }),
	};
};

/** `settings` with a `PreToolUse` hook on `Bash` appended to any it already has. */
export const settingsWithHook = (
	settings: Record<string, unknown>,
	command: string,
): Record<string, unknown> => {
	const hooks = fieldOf(settings, "hooks");
	const pre = fieldOf(hooks, "PreToolUse");
	return {
		...settings,
		hooks: {
			...(typeof hooks === "object" && hooks !== null ? hooks : {}),
			PreToolUse: [
				...(Array.isArray(pre) ? pre : []),
				{ matcher: "Bash", hooks: [{ type: "command", command }] },
			],
		},
	};
};

/** The content of the `tool_result` that the CLI sent back in `body`, as text. */
export const toolResultOf = (body: string | undefined): string => {
	const messages = fieldOf(JSON.parse(body ?? "{}"), "messages");
	const content = fieldOf(
		Array.isArray(messages) ? messages.at(-1) : undefined,
		"content",
	);
	const result = (Array.isArray(content) ? content : []).find(
		(block) => fieldOf(block, "type") === "tool_result",
	);
	const text = fieldOf(result, "content");
	if (text === undefined) {
		return "no result";
	}
	return typeof text === "string" ? text : JSON.stringify(text);
};
