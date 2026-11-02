import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export interface UsageFields {
	readonly input?: number;
	readonly output?: number;
	readonly read?: number;
	readonly write?: number;
}

export interface AssistantFields extends UsageFields {
	readonly id: string;
	readonly at: string;
	readonly model?: string;
	readonly session?: string;
	readonly sidechain?: boolean;
	readonly content?: readonly unknown[];
}

export const assistant = (fields: AssistantFields): string =>
	JSON.stringify({
		type: "assistant",
		timestamp: fields.at,
		requestId: `req_${fields.id}`,
		sessionId: fields.session ?? "s1",
		isSidechain: fields.sidechain ?? false,
		message: {
			id: fields.id,
			model: fields.model ?? "claude-opus-5-5",
			content: fields.content ?? [],
			usage: {
				input_tokens: fields.input ?? 0,
				output_tokens: fields.output ?? 0,
				cache_read_input_tokens: fields.read ?? 0,
				cache_creation_input_tokens: fields.write ?? 0,
			},
		},
	});

export const boundary = (): string =>
	JSON.stringify({ type: "system", subtype: "compact_boundary" });

export const toolResult = (id: string, text: string): string =>
	JSON.stringify({
		type: "user",
		message: {
			content: [{ type: "tool_result", tool_use_id: id, content: text }],
		},
	});

export const userText = (text: string): string =>
	JSON.stringify({ type: "user", message: { content: text } });

export const makeRoot = (): Promise<string> =>
	mkdtemp(join(tmpdir(), "claudekit-usage-"));

export const writeTranscript = async (
	root: string,
	relative: string,
	lines: readonly string[],
): Promise<string> => {
	const path = join(root, relative);
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, `${lines.join("\n")}\n`);
	return path;
};
