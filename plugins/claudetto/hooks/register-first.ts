import type { On, PluginOptions } from "claude-code";

import { chain, checkFault } from "./chain.ts";
import { delegation, delegationCall } from "./delegation.ts";
import { limits, limitsCall, limitsCheck, limitsState } from "./limits.ts";
import { pin, pinCall, pinCheck, pinState } from "./pin.ts";
import { lastCall, lastCheck, type LastState } from "./register-last.ts";
import { runs, runsCall, runsState } from "./runs.ts";
import { setup } from "./setup.ts";
import { slices, slicesCall, slicesState } from "./slices.ts";
import { surface, surfaceCall } from "./surface.ts";

/** The first registrations in wrap order: `slices` is outermost, so it asks for a commit only after every other Stop check passed; `limits` bounds what every later hook adds. The one `tool.check` and one `tool.call` hook list every guard, in wrap order, down to those of `registerLast`. */
export const registerFirst = (
	on: On,
	options: PluginOptions,
	last: LastState,
): void => {
	const written = slicesState();
	const held = limitsState(options);
	const pinned = pinState();
	const ran = runsState();
	slices(on, written);
	limits(on, options, held);
	setup(on, options);
	surface(on, options);
	pin(on, pinned);
	delegation(on);
	runs(on, ran);

	on("tool.check", ($, e, next) =>
		chain(e, next, [
			(at, step) => limitsCheck($, at, step, held),
			(at, step) => pinCheck($, at, step, pinned),
			(at, step) => lastCheck($, at, step, last),
		]),
	).catch((_error, _e, next) => ({
		decision: "ask",
		reason: checkFault(next),
	}));

	on("tool.call", ($, e, next) =>
		chain(e, next, [
			(at, step) => slicesCall($, at, step, written),
			(at, step) => limitsCall($, at, step, held, options),
			(at, step) => surfaceCall(at, step, options),
			(at, step) => pinCall(at, step, pinned),
			(at, step) => delegationCall($, at, step),
			(at, step) => runsCall(at, step, ran),
			(at, step) => lastCall($, at, step, last, options),
		]),
	).catch(async (_error, e, next) => {
		if (next.called) {
			await next(e);
		}
		return { deny: next.error.message ?? next.error.kind };
	});
};
