/// <reference types="bun" />
const HEADING = /^(#{1,6})\s+What I Need From You\s*$/u;
const ANY_HEADING = /^(#{1,6})\s+\S/u;
const FENCE = /^\s*(`{3,}|~{3,})\s*([\w-]*)/u;
const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+(.*\S)\s*$/u;
const CHECKBOX = /^\[ \]\s+(.*)$/u;
const COMMAND_ITEM = /^`?!\s+(.*?)`?$/u;
const BARE_COMMAND = /^\s*!\s+\S/u;
const SHELL_LANGS = new Set(["sh", "bash", "shell", "zsh"]);

/** A task list numbers each task `1.2`, and a report copies the unticked ones whole, so such an item reports a task and asks nothing. */
const TASK_NUMBER = /^\d+(?:\.\d+)+\s/u;

const DENIED = [
	/^Permission to use .* denied/u,
	/^Permission for this action was denied/u,
	/^The user doesn't want to proceed with this tool use/u,
];

type Outcome = "succeeded" | "failed" | "denied";

interface Item {
	readonly kind: "command" | "shell" | "checkbox" | "bare";
	readonly text: string;
	readonly inSection: boolean;
}

/** The heading level in force after `line`, or `undefined` when `line` is no heading. */
const levelAfter = (line: string, level: number): number | undefined => {
	const heading = ANY_HEADING.exec(line);
	if (heading === null) {
		return undefined;
	}
	const depth = heading[1]?.length ?? 0;
	if (HEADING.test(line)) {
		return depth;
	}
	return level > 0 && depth <= level ? 0 : level;
};

const itemOf = (line: string, inSection: boolean): Item | undefined => {
	const text = LIST_ITEM.exec(line)?.[1];
	if (text === undefined) {
		return BARE_COMMAND.test(line)
			? { kind: "bare", text: line.trim(), inSection }
			: undefined;
	}
	const unticked = CHECKBOX.exec(text)?.[1];
	if (unticked !== undefined && !TASK_NUMBER.test(unticked)) {
		return { kind: "checkbox", text: unticked, inSection };
	}
	const command = COMMAND_ITEM.exec(text)?.[1];
	return command === undefined
		? undefined
		: { kind: "command", text: command, inSection };
};

interface Fence {
	readonly marker: string;
	readonly lang: string;
	readonly body: string[];
}

/** The structure of a reply: list items, fenced blocks, and bare lines. A fence outside the section is example text and yields nothing. */
const itemsOf = (reply: string): Item[] => {
	const items: Item[] = [];
	let level = 0;
	let fence: Fence | undefined;
	for (const line of reply.split("\n")) {
		if (fence !== undefined) {
			if (line.trim().startsWith(fence.marker)) {
				if (level > 0 && SHELL_LANGS.has(fence.lang)) {
					items.push({
						kind: "shell",
						text: fence.body.join("\n"),
						inSection: true,
					});
				}
				fence = undefined;
			} else {
				fence.body.push(line);
			}
			continue;
		}
		const opened = FENCE.exec(line);
		if (opened !== null) {
			fence = { marker: opened[1] ?? "```", lang: opened[2] ?? "", body: [] };
			continue;
		}
		const heading = levelAfter(line, level);
		if (heading !== undefined) {
			level = heading;
			continue;
		}
		const item = itemOf(line, level > 0);
		if (item !== undefined) {
			items.push(item);
		}
	}
	return items;
};

/** What is wrong with the form of the request in `reply`, or `undefined` when the form holds. */
export const formFault = (reply: string): string | undefined => {
	const items = itemsOf(reply);
	const checkbox = items.find((item) => item.kind === "checkbox");
	if (checkbox !== undefined) {
		return `\`- [ ] ${checkbox.text}\` is a question in a form nobody ticks. Ask it in prose, or give a command only the user can run as one \`- ! <command>\` bullet under \`## What I Need From You\`.`;
	}
	const bare = items.find((item) => item.kind === "bare");
	if (bare !== undefined) {
		return `\`${bare.text}\` is no bullet. Write a command only the user can run as \`- ! <command>\` under \`## What I Need From You\`.`;
	}
	const loose = items.find(
		(item) => item.kind === "command" && !item.inSection,
	);
	if (loose !== undefined) {
		return `\`- ! ${loose.text}\` sits outside the heading. Move it under \`## What I Need From You\`.`;
	}
	const asked = items.filter((item) => item.inSection);
	if (asked.length > 1) {
		return "Give the user one command to run: keep one `- ! <command>` bullet or one fenced `sh` block under `## What I Need From You`, because the user's `!` runs queue while you work.";
	}
	return undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const partsOf = (row: string): Record<string, unknown>[] => {
	let parsed: unknown;
	try {
		parsed = JSON.parse(row);
	} catch {
		return [];
	}
	const message = isRecord(parsed) ? parsed["message"] : null;
	const content = isRecord(message) ? message["content"] : null;
	return Array.isArray(content) ? content.filter((part) => isRecord(part)) : [];
};

const commandOf = (part: Record<string, unknown>): string => {
	const input = part["input"];
	const command = isRecord(input) ? input["command"] : "";
	return typeof command === "string" ? command.trim() : "";
};

/** The outcome of the last Bash run of each command in a session transcript. */
export const lastRuns = (transcript: string): Map<string, Outcome> => {
	const commands = new Map<string, string>();
	const runs = new Map<string, Outcome>();
	for (const part of transcript.split("\n").flatMap((row) => partsOf(row))) {
		if (part["type"] === "tool_use" && part["name"] === "Bash") {
			commands.set(String(part["id"]), commandOf(part));
		} else if (part["type"] === "tool_result") {
			const command = commands.get(String(part["tool_use_id"]));
			if (command !== undefined) {
				runs.set(command, outcomeOf(part));
			}
		}
	}
	return runs;
};

const textOf = (content: unknown): string =>
	Array.isArray(content)
		? content.map((part: { text?: string }) => part.text ?? "").join("\n")
		: String(content);

const outcomeOf = (result: Record<string, unknown>): Outcome => {
	if (result["is_error"] !== true) {
		return "succeeded";
	}
	const text = textOf(result["content"]);
	return DENIED.some((denial) => denial.test(text)) ? "denied" : "failed";
};

/** The 7.22 rule: a command bullet that no Bash call tried, or whose last run succeeded, is a command the agent can run itself. */
export const untriedOrDone = (
	reply: string,
	transcript: string,
): string | undefined => {
	const runs = lastRuns(transcript);
	for (const item of itemsOf(reply)) {
		if (item.kind !== "command") {
			continue;
		}
		const outcome = runs.get(item.text.trim());
		if (outcome === undefined) {
			return `\`${item.text}\` ran in no Bash call of this session. Run it with Bash. Keep the bullet only if the run is denied or fails.`;
		}
		if (outcome === "succeeded") {
			return `\`${item.text}\` succeeded when you ran it. Drop the bullet.`;
		}
	}
	return undefined;
};

interface StopInput {
	readonly last_assistant_message?: string;
	readonly stop_hook_active?: boolean;
}

interface HookInput extends StopInput {
	readonly transcript_path?: string;
}

const isStopInput = (value: unknown): value is HookInput => isRecord(value);

/** The block reason for a Stop, or `undefined` to let it end. A stop that an earlier block caused passes, so the same block never repeats. */
export const blockOf = (
	input: StopInput,
	transcript: string,
	enabled: string,
): string | undefined => {
	if (enabled === "false" || input.stop_hook_active === true) {
		return undefined;
	}
	const reply = input.last_assistant_message ?? "";
	return formFault(reply) ?? untriedOrDone(reply, transcript);
};

if (import.meta.main) {
	const input: unknown = await Bun.stdin.json();
	if (!isStopInput(input)) {
		throw new TypeError("The Stop input is no object");
	}
	const transcript = await Bun.file(input.transcript_path ?? "")
		.text()
		.catch(() => "");
	const reason = blockOf(
		input,
		transcript,
		process.env["CLAUDE_PLUGIN_OPTION_OPENITEMSCHECKENABLED"] ?? "",
	);
	if (reason !== undefined) {
		process.stdout.write(JSON.stringify({ decision: "block", reason }));
	}
}
