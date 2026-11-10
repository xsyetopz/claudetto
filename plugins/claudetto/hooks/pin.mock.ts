import type { On, SessionMessage } from "claude-code";
import type { Engine } from "claude-code/testing";

/** Stubs beneath the pin: the ledger model answers `kind` and `constraints`, and records each prompt it is sent in `seen`. */
export const lab = (
	on: On,
	constraints: unknown[],
	messages: SessionMessage[] = [],
	seen: string[] = [],
	kind = "task",
): void => {
	on("prompt.submit", (_$, e) => e);
	on("tool.check", () => ({ decision: "allow" }));
	on("session.messages", () => ({ value: messages }));
	on("session.cwd", () => ({ value: "/repo" }));
	on("fs.exists", () => ({ value: false }));
	on("model.complete", (_$, e) => {
		seen.push(e.prompt);
		return {
			value: {
				isAnswered: true,
				text: JSON.stringify({ kind, constraints }),
				usage: {
					input_tokens: 1,
					output_tokens: 1,
					cache_read_input_tokens: 0,
					cache_creation_input_tokens: 0,
				},
			},
		};
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

export const RO = [
	{
		text: "Nothing should change on disk.",
		rule: "read-only",
		quote: "Nothing should change on disk.",
	},
];

/** A user message that carries one tool result and no text. */
export const RESULT_ROW: SessionMessage = {
	role: "user",
	text: "",
	toolUses: [],
	toolResults: [{ tool_use_id: "t", text: "", isError: false }],
};

export const person: SessionMessage = {
	role: "user",
	text: "Who told you to lint the docs?",
	toolUses: [],
};

export const spoken = (text: string, ...tools: string[]): SessionMessage => ({
	role: "assistant",
	text,
	toolUses: tools.map((tool) => ({ tool_use_id: "t", tool, input: {} })),
});

/** A turn whose ledger reads the person's message as `kind`, with `after` following it in the transcript. */
export const turn =
	(kind: string, ...after: SessionMessage[]) =>
	($: Engine, on: On) => {
		lab(on, [], [person, ...after], [], kind);
		return submit($, person.text);
	};
