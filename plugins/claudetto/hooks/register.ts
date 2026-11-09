import type { On, PluginOptions } from "claude-code";
import { decide } from "./decide.ts";
import { delegation } from "./delegation.ts";
import { gate } from "./gate.ts";
import { handoff } from "./handoff.ts";
import { hygiene } from "./hygiene.ts";
import { limits } from "./limits.ts";
import { notify } from "./notify.ts";
import { stringOption } from "./options.ts";
import { pin } from "./pin.ts";
import { setup } from "./setup.ts";
import { slices } from "./slices.ts";
import { surface } from "./surface.ts";
import { ASK_SPEC, DECIDE_SPEC, MONITOR_SPEC } from "./texts.ts";

// Registration order is wrap order: `slices` is outermost, so it asks for a commit only after every other Stop check passed; `limits` bounds what every later hook adds.
export const register = (on: On, options: PluginOptions): void => {
	slices(on);
	limits(on, options);
	setup(on);
	surface(on, options);
	pin(on);
	delegation(on);
	decide(on, options);
	handoff(on, options);
	hygiene(on, options);
	notify(on, options);
	gate(on, options);

	// The engine takes one unmatched `session.start` per module, and `classic.SessionStart` under `-p` has no session to register a tool on.
	on("session.start", async ($, e, next) => {
		const out = await next(e);
		await $.tool.register(ASK_SPEC);
		await $.tool.register(MONITOR_SPEC);
		if (stringOption(options, "typesafeApiKey")) {
			await $.tool.register(DECIDE_SPEC);
		}
		return out;
	});
};
