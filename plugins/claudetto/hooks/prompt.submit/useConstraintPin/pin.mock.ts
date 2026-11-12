import type { On, SessionMessage } from "claude-code";
import type { Engine } from "claude-code/testing";

import { haikuText } from "../../decider/decider.mock";

/** The sentences the model reads as a limit, each with the rule it states. */
type Limits = Readonly<Record<string, string>>;

const SENTENCES = /<sentences>\n([\s\S]*?)\n<\/sentences>/u;
const NUMBERED = /^(\d+)\. (.*)$/gmu;
const MESSAGE = /<message>\n([\s\S]*?)\n<\/message>/u;

const replyTo = (prompt: string, limits: Limits): string => {
	const listed = [...(SENTENCES.exec(prompt)?.[1] ?? "").matchAll(NUMBERED)];
	return JSON.stringify(
		Object.fromEntries(
			listed.flatMap(([, i, sentence = ""]): [string, object][] =>
				Object.hasOwn(limits, sentence)
					? [
							[`restricts_${i}`, { answer: "yes", evidence: sentence }],
							[`rule_${i}`, { answer: limits[sentence], evidence: sentence }],
						]
					: [[`restricts_${i}`, { answer: "no" }]],
			),
		),
	);
};

/** Stubs beneath the pin: no key is set, so the ledger's model answers. It reads each sentence in `limits` as a limit, records each prompt it is sent in `seen`, and answers about a message in `held` once that promise settles. */
export const lab = (
	on: On,
	limits: Limits,
	messages: SessionMessage[] = [],
	seen: string[] = [],
	held: Readonly<Record<string, Promise<unknown>>> = {},
): void => {
	on("prompt.submit", (_$, e) => e);
	on("tool.check", () => ({ decision: "allow" }));
	on("session.messages", () => ({ value: messages }));
	on("session.cwd", () => ({ value: "/repo" }));
	on("fs.exists", () => ({ value: false }));
	on("env.get", () => ({ value: undefined }));
	on("model.complete", async (_$, e) => {
		seen.push(e.prompt);
		await held[MESSAGE.exec(e.prompt)?.[1] ?? ""];
		return { value: haikuText(replyTo(e.prompt, limits)) };
	});
};

export const submit = (
	$: Engine,
	text = "Make it pass. Nothing should change on disk.",
) => $.prompt.submit({ text, wait: false, origin: { kind: "composer" } });

export const check = (
	$: Engine,
	tool: string,
	input: Record<string, unknown>,
) => $.tool.check({ tool, input });

/** The context a submit added, with none as an empty list. */
export const added = (out: {
	context?: readonly string[] | undefined;
}): readonly string[] => out.context ?? [];

export const RO = { "Nothing should change on disk.": "read-only" };

/** A user message that carries one tool result and no text. */
export const RESULT_ROW: SessionMessage = {
	role: "user",
	text: "",
	toolUses: [],
	toolResults: [{ tool_use_id: "t", text: "", isError: false }],
};

export const spoken = (text: string): SessionMessage => ({
	role: "assistant",
	text,
	toolUses: [],
});
