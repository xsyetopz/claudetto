import type { On, PluginOptions } from "claude-code";

import { stringOption } from "./options.ts";
import { registerFirst } from "./register-first.ts";
import { lastState, registerLast } from "./register-last.ts";
import { DECIDE_SPEC } from "./texts-gate.ts";
import { ASK_SPEC, MONITOR_SPEC, REPLY_SPEC } from "./texts.ts";

// Registration order is wrap order, and `registerFirst` goes before `registerLast`.
export const register = (on: On, options: PluginOptions): void => {
	const last = lastState(options);
	registerFirst(on, options, last);
	registerLast(on, options, last);

	// The engine takes one unmatched `session.start` per module, and `classic.SessionStart` under `-p` has no session to register a tool on.
	on("session.start", async ($, e, next) => {
		const out = await next(e);
		await $.tool.register(ASK_SPEC);
		await $.tool.register(MONITOR_SPEC);
		await $.command.register(REPLY_SPEC);
		if (stringOption(options, "typesafeApiKey") !== "") {
			await $.tool.register(DECIDE_SPEC);
		}
		return out;
	});
};
