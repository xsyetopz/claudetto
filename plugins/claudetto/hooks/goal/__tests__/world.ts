/** The engine a goal test runs against: `/goal`, the goal tools and the session they read. */
import type { SessionAppendInput, ToolUseSummary } from "claude-code";
import { mock, type TestBody } from "claude-code/testing";

export type Dollar = Parameters<TestBody>[0];
export type Mocks = Parameters<TestBody>[1];

export const GET = "mcp__claudetto__get_goal";
export const SET = "mcp__claudetto__set_goal";
export const PAUSE = "mcp__claudetto__pause_goal";
export const CLEAR = "mcp__claudetto__clear_goal";

/** The engine's answer to `/goal <condition>` (probed on 2.1.330). */
export const engine = (
	on: Mocks,
	existing: readonly string[] = [],
	uses: readonly ToolUseSummary[] = [],
	env: Record<string, string> = {}
) => {
	const ran: string[] = [];
	on("command.run", (_$, e) => {
		ran.push(e.args);
		return {
			text: e.args === "clear" ? "Goal cleared" : `Goal set: ${e.args}`
		};
	});
	on("session.cwd", () => ({ value: "/work" }));
	on("fs.exists", (_$, e) => ({ value: existing.includes(e.path) }));
	on("session.messages", () => ({
		value: [{ role: "assistant", text: "", toolUses: [...uses] }]
	}));
	on("session.start", (_$, e) => ({ cwd: e.cwd }));
	on("ui.notify", () => ({
		value: { isSent: true, channel: "terminal_bell" }
	}));
	on("ui.log", () => ({ value: undefined }));
	on("env.get", (_$, e) => ({ value: env[e.name] }));
	// Advancing the clock runs a queued `/goal`.
	const clock = mock.clock(on);
	return { ran, clock };
};

export const row = (
	door: SessionAppendInput["door"],
	text: string,
	name?: string
): SessionAppendInput => ({
	door,
	origin: { kind: "engine" },
	uuid: `u-${text.length}`,
	message: {
		type: door === "response" ? "assistant" : "user",
		content: [{ type: "text", text }],
		...(name === undefined ? {} : { name })
	}
});

export const setGoal = ($: Dollar, args: string) =>
	$.command.run({
		command: "goal",
		args,
		origin: { kind: "composer" },
		presentation: { isFullscreen: false, columns: 80 }
	});

/** Appends `count` block rows one after another, as the engine does, and returns each answer. */
export const blocks = async ($: Dollar, count: number, feedback: string) => {
	async function* rows() {
		for (let block = 1; block <= count; block += 1) {
			yield $.session.append(row("note", feedback));
		}
	}
	const answers: Awaited<ReturnType<Dollar["session"]["append"]>>[] = [];
	for await (const answer of rows()) {
		answers.push(answer);
	}
	return answers;
};

export const stateOf = async ($: Dollar): Promise<string> => {
	const { result } = await $.tool.call({ tool: GET });
	return typeof result === "string" ? result : "";
};
