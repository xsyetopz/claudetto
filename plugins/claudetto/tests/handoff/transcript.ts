import type { On, SessionMessage, ToolResultSummary } from "claude-code";

export const said = (
	role: SessionMessage["role"],
	text: string,
): SessionMessage => ({ role, text, toolUses: [] });

/** An assistant message that says `text` and calls `tool` on `input`. */
export const used = (
	text: string,
	tool: string,
	input: Record<string, unknown>,
): SessionMessage => ({
	role: "assistant",
	text,
	toolUses: [{ tool_use_id: `toolu_${tool}`, tool, input }],
});

/** A user message that carries only tool results. */
export const answered = (
	...toolResults: ToolResultSummary[]
): SessionMessage => ({ role: "user", text: "", toolUses: [], toolResults });

export interface Line {
	readonly text: string;
	readonly to: string;
}

/** The repo root, and a log that fills `lines`. */
export const logInto = (on: On, lines: Line[]): void => {
	on("session.root", () => ({ value: "/repo" }));
	on("ui.log", (_$, e) => {
		lines.push({ text: e.text, to: e.to });
		return { value: undefined };
	});
};
