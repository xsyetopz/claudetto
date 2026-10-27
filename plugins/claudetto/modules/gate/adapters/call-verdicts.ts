// The verdicts of `tool.check` that come from the call itself: the `ask` at red usage and the `deny` of the engine or of a wrong tool.

import type { EngineInterface } from "claude-code";
import { runningAgents } from "../../project/domain/session.ts";
import { sharesOf } from "../../session/domain/usage.ts";
import { isRecord, type Verdict } from "../domain/gate.ts";
import { mayAsk, usageAsk } from "../domain/usage.ts";
import { wrongTool } from "../domain/wrongtool.ts";

/** The call that is checked. */
interface CheckEvent {
	tool: string;
	input: unknown;
}

/** What the ask at red needs: the usage of the session and the list of agents. `mod.ts` builds it from `$`. */
export interface RedIo {
	usage: EngineInterface["session"]["usage"];
	agents: EngineInterface["agent"]["list"];
}

export const commandOf = (input: unknown): unknown =>
	isRecord(input) ? input["command"] : undefined;

/** The `ask` for the call at red, or `undefined`. The 5-hour share comes from `$.session.usage()`, and the weekly share never asks. A fault of the read adds no ask. */
export const askAtRed = async (
	io: RedIo,
	e: CheckEvent,
): Promise<Verdict | undefined> => {
	const command = commandOf(e.input);
	if (!mayAsk(e.tool, command)) {
		return undefined;
	}
	try {
		const { rateLimits } = await io.usage();
		const reason = await usageAsk({
			tool: e.tool,
			command,
			fiveHour: sharesOf(rateLimits).five_hour,
			othersRun: async () => runningAgents(await io.agents()).length > 0,
		});
		return reason === null ? undefined : { decision: "ask", reason };
	} catch {
		return undefined;
	}
};

/** The `deny` of the engine, else the `deny` for a `Bash` call with the wrong tool, or `undefined`. */
export const wrongCall = (
	e: CheckEvent,
	engine: Verdict,
): Verdict | undefined => {
	if (engine.decision === "deny") {
		return engine;
	}
	const command = commandOf(e.input);
	const reason =
		e.tool === "Bash" && typeof command === "string"
			? wrongTool(command)
			: undefined;
	return reason ? { decision: "deny", reason } : undefined;
};
