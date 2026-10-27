// The early items of a long session survive in the handoff as often as the late ones (spec `code-compaction`, "Handoff Format").

import { expect, test } from "bun:test";
import type { SessionMessage } from "claude-code";
import { handoffText } from "../../../../plugins/claudetto/modules/session/handoff/handover.ts";

const TURNS = 300;

const user = (text: string): SessionMessage => ({
	role: "user",
	text,
	toolUses: [],
});

const assistant = (toolUses: SessionMessage["toolUses"]): SessionMessage => ({
	role: "assistant",
	text: "",
	toolUses,
});

const ask = (n: number): SessionMessage["toolUses"][number] => ({
	tool_use_id: `ask${n}`,
	tool: "AskUserQuestion",
	input: { questions: [{ question: `Q${n}`, options: [{ label: `o${n}` }] }] },
	text: `User has answered your questions: "Q${n}"="o${n}".`,
});

const read = (n: number): SessionMessage["toolUses"][number] => ({
	tool_use_id: `read${n}`,
	tool: "Read",
	input: { file_path: `src/file-${n}.ts` },
	text: "ok",
});

/** A session of `TURNS` turns, each with a rule, a value, a read, and a question. */
const session = (): SessionMessage[] =>
	Array.from({ length: TURNS }, (_, n) => [
		user(`Never use word${n}. The value is \`val${n}\`.`),
		assistant([read(n), ask(n)]),
	]).flat();

test("the first rule, value, read file, and decision survive more than the caps held", () => {
	const text = handoffText({ messages: session() });

	expect(text).toContain("Never use word0.");
	expect(text).toContain("`val0`");
	expect(text).toContain("`src/file-0.ts`");
	expect(text).toContain("`o0`");
});

test("the last rule, value, read file, and decision survive too", () => {
	const text = handoffText({ messages: session() });
	const last = TURNS - 1;

	expect(text).toContain(`Never use word${last}.`);
	expect(text).toContain(`\`val${last}\``);
	expect(text).toContain(`\`src/file-${last}.ts\``);
	expect(text).toContain(`\`o${last}\``);
});
