#!/usr/bin/env bun
import { homedir } from "node:os";
import { join } from "node:path";
import { argv, env } from "node:process";
import { file as bunFile, Glob } from "bun";
import { firstSentence, hasEvidence } from "./evidence.ts";

interface Reply {
	readonly project: string;
	readonly opening: string;
}

const argOf = (name: string): string | undefined => {
	const at = argv.indexOf(`--${name}`);
	return at >= 0 ? argv[at + 1] : undefined;
};

interface Row {
	readonly role: string;
	readonly text: string;
	readonly isToolResult: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

/** The text of a content part, or none when the part is a tool call, a tool result, or an image. */
const textOf = (part: unknown): string | undefined =>
	isRecord(part) && part["type"] === "text" && typeof part["text"] === "string"
		? part["text"]
		: undefined;

const kindOf = (part: unknown): unknown =>
	isRecord(part) ? part["type"] : undefined;

/** The content of a message, as the parts of an array or as a plain string. */
const bodyOf = (content: unknown): Omit<Row, "role"> | undefined => {
	if (typeof content === "string") {
		return { text: content.trim(), isToolResult: false };
	}
	if (!Array.isArray(content)) {
		return undefined;
	}
	const texts = content
		.map(textOf)
		.filter((text): text is string => text !== undefined);
	return {
		text: texts.join("\n").trim(),
		isToolResult: content.map(kindOf).includes("tool_result"),
	};
};

/** One transcript line as the reading needs it: who spoke, their text, and whether it is tool output. */
const rowOf = (line: string): Row | undefined => {
	let parsed: unknown;
	try {
		parsed = JSON.parse(line);
	} catch {
		return undefined;
	}
	const message = isRecord(parsed) ? parsed["message"] : undefined;
	if (!isRecord(message)) {
		return undefined;
	}
	const role = message["role"];
	const body = bodyOf(message["content"]);
	return typeof role === "string" && body !== undefined
		? { role, ...body }
		: undefined;
};

const projectsRoot = (): string =>
	join(env["CLAUDE_CONFIG_DIR"] ?? join(homedir(), ".claude"), "projects");

/**
 * The final visible text of each turn of one transcript. `turn.complete` carries that text and not
 * every text block of a turn, so the reading keeps the last text of the assistant and emits it when
 * the next prompt of the person arrives. A `tool_result` is not a prompt: it continues the turn.
 */
export const answersOf = (transcript: string): readonly string[] => {
	const answers: string[] = [];
	let last: string | undefined;
	for (const line of transcript.split("\n")) {
		const row = rowOf(line);
		const isAnswer = row?.role === "assistant" && row.text !== "";
		const isPrompt = row?.role === "user" && !row.isToolResult;
		if (isAnswer) {
			last = row?.text;
		} else if (isPrompt && last !== undefined) {
			answers.push(last);
			last = undefined;
		}
	}
	if (last !== undefined) {
		answers.push(last);
	}
	return answers;
};

const read = async (only: string | undefined): Promise<readonly Reply[]> => {
	const root = projectsRoot();
	const replies: Reply[] = [];
	for await (const path of new Glob("*/*.jsonl").scan({ cwd: root })) {
		const project = path.split("/")[0] ?? "";
		if (only !== undefined && !project.includes(only)) {
			continue;
		}
		const text = await bunFile(join(root, path)).text();
		for (const answer of answersOf(text)) {
			replies.push({ project, opening: firstSentence(answer) });
		}
	}
	return replies;
};

const main = async (): Promise<void> => {
	const replies = await read(argOf("project"));
	const flagged = replies.filter((reply) => !hasEvidence(reply.opening));
	const share =
		replies.length === 0 ? 0 : (flagged.length / replies.length) * 100;
	console.info(
		`${replies.length} replies read, ${flagged.length} carry no code span and no digit in the first sentence (${share.toFixed(1)}%)`,
	);
	const byProject = new Map<string, { all: number; flagged: number }>();
	for (const reply of replies) {
		const row = byProject.get(reply.project) ?? { all: 0, flagged: 0 };
		row.all += 1;
		if (!hasEvidence(reply.opening)) {
			row.flagged += 1;
		}
		byProject.set(reply.project, row);
	}
	for (const [project, row] of byProject) {
		console.info(
			`  ${project}: ${row.flagged} of ${row.all} (${((row.flagged / row.all) * 100).toFixed(1)}%)`,
		);
	}
	const sample = Number(argOf("sample") ?? 0);
	for (const [label, rows] of [
		["flagged", flagged],
		["passed", replies.filter((reply) => hasEvidence(reply.opening))],
	] as const) {
		for (const reply of rows.slice(0, sample)) {
			console.info(`  ${label}: ${reply.opening.slice(0, 160)}`);
		}
	}
};

if (import.meta.main) {
	await main();
}
