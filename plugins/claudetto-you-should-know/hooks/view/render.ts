/** The band above the prompt: the note row for this session's stored view. */

import type { On } from "claude-code";

import { tagOf } from "../request/parse";
import { isUnattendedInFlight, rowOf } from "../session/rows";
import type { Ctx } from "../shared/context";
import { fault } from "../shared/fault";
import { aboutShown } from "../shared/store";
import { clearUnattended, flagsOf } from "./flags";
import { freezeWorkingIdle, trackIdle } from "./idle";
import { pickElement } from "./pick";
import { rowsTable } from "./table";

export function registerRender(on: On, ctx: Ctx): void {
	on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
		freezeWorkingIdle(e, ctx);
		const table = rowsTable(e.surface, $.ui.resolve(e));
		const sid = await $.session.id();
		ctx.rendered.add(e.surface);
		const row = rowOf(await $.store.get("sessions"), sid);
		const view = row?.view ?? null;
		const tag = tagOf(row?.tag ?? "");
		const { isOptIn, checks } = await flagsOf($, row);
		if (isUnattendedInFlight(view, sid, ctx.explaining)) {
			await clearUnattended($, sid, (fresh) =>
				isUnattendedInFlight(fresh, sid, ctx.explaining)
			);
			return next(e);
		}
		const about = view?.kind === "offer" ? await aboutShown($, sid) : undefined;
		const shown = { e, view, tag, about, checkCount: checks.length };
		trackIdle(shown, ctx, sid, next.signal.aborted);
		if (e.props.hasSurvey && view?.kind !== "explained") {
			return next(e);
		}
		const picked = pickElement($, {
			e,
			view,
			sid,
			tag,
			table,
			ctx,
			isOptIn,
			about,
			checks
		});
		return picked ?? next(e);
	}).catch(($, _e, next) => {
		fault($, "ui.render", next.error);
		ctx.idle.clear();
	});
}
