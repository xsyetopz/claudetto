/** Session lifecycle: surfaces that detach and sessions that end. */

import type { On } from "claude-code";

import type { Ctx } from "./context";
import { forgetDetached, isOpenView, rowOf, withViewCleared } from "./session-rows";

export function registerSession(on: On, ctx: Ctx): void {
	on("session.detach", async ($, e, next) => {
		forgetDetached(ctx.rendered, await $.session.surfaces());
		return next(e);
	});
	on("session.end", async ($, e, next) => {
		ctx.ended.add(e.sessionId);
		ctx.bridge.delete(e.sessionId);
		ctx.idle.delete(e.sessionId);
		try {
			const rows = await $.store.get("sessions");
			const view = rowOf(rows, e.sessionId)?.view;
			if (isOpenView(view) || view?.kind === "off") {
				await $.store.set("sessions", withViewCleared(rows, e.sessionId));
			}
		} catch {
			// the row is cleared at the next prompt
		}
		return next(e);
	});
}
