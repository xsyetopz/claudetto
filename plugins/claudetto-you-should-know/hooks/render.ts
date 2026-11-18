/** The band above the prompt: the note row for this session's stored view. */

import type { On, RenderElement } from "claude-code";

import { isOptIn, switchOf } from "./backoff";
import { checksOf } from "./checks";
import { OFFER_LABELS } from "./constants";
import type { Ctx } from "./context";
import { aboutKeyOf, closedOfferRows } from "./copy";
import { tagOf } from "./parse";
import { debugRows } from "./rows";
import { idleMsOf, isUnattendedInFlight, rowOf, withRow } from "./session-rows";
import { aboutShown, toggleAbout } from "./store";
import { rowsTable } from "./table";
import { actionsFor } from "./view-actions";
import { rowFor } from "./view-row";

export function registerRender(on: On, ctx: Ctx): void {
	on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
		if (e.surface === "terminal" && e.props.isWorking) {
			const now = Date.now();
			for (const [id, entry] of ctx.idle) {
				ctx.idle.set(id, { ...entry, idle: { ms: idleMsOf(entry.idle, now) } });
			}
		}
		const table = rowsTable(e.surface, $.ui.resolve(e));
		const sid = await $.session.id();
		ctx.rendered.add(e.surface);
		const rows = await $.store.get("sessions");
		const row = rowOf(rows, sid);
		const view = row?.view ?? null;
		const tag = tagOf(row?.tag ?? "");
		const debug = await switchOf($.env.get("CLAUDE_CODE_YOU_SHOULD_KNOW_DEBUG"));
		const optIn = isOptIn(await $.env.get("USER_TYPE").catch(() => undefined));
		const checks = debug ? checksOf(row?.checks) : [];
		if (isUnattendedInFlight(view, sid, ctx.explaining)) {
			const fresh = rowOf(await $.store.get("sessions"), sid)?.view;
			if (isUnattendedInFlight(fresh, sid, ctx.explaining)) {
				const all = await $.store.get("sessions");
				await $.store.set("sessions", withRow(all, { ...(rowOf(all, sid) ?? { id: sid }), view: undefined }));
			}
			return next(e);
		}
		const about = view?.kind === "offer" ? await aboutShown($, sid) : undefined;
		const isClosedOffer =
			e.surface === "terminal" &&
			!e.props.hasSurvey &&
			!e.props.isCollapsed &&
			checks.length === 0 &&
			view?.kind === "offer" &&
			view.isOffArmed !== true &&
			e.props.scroll.offset === 0 &&
			about !== aboutKeyOf(view) &&
			closedOfferRows({
				columns: e.props.bodyColumns,
				tag,
				line: view.line,
				labels: Object.values(OFFER_LABELS),
			}) <= e.props.maxRows;
		if (!isClosedOffer) {
			ctx.idle.delete(sid);
		} else if (view?.kind === "offer" && view.shownAt !== undefined && !next.signal.aborted) {
			const prev = ctx.idle.get(sid);
			const now = Date.now();
			const base = prev?.shownAt === view.shownAt && prev.line === view.line ? prev.idle : { ms: 0 };
			ctx.idle.set(sid, {
				shownAt: view.shownAt,
				line: view.line,
				idle: e.props.isWorking
					? { ms: idleMsOf(base, now) }
					: { since: "since" in base ? base.since : now },
			});
		}
		if (e.props.hasSurvey && view?.kind !== "explained") {
			return next(e);
		}
		const picked = rowFor({
			view,
			sid,
			tag,
			surface: e.surface,
			props: e.props,
			table,
			actions: actionsFor($, sid, ctx),
			ctx,
			isOptIn: optIn,
			isAboutOpen: view?.kind === "offer" && about === aboutKeyOf(view),
			toggleAbout: (key) => {
				void toggleAbout($, { sid, key });
			},
		});
		if (checks.length > 0 && !e.props.hasSurvey) {
			return debugRows(table, checks, picked) as RenderElement;
		}
		return (picked as RenderElement | null) ?? next(e);
	}).catch(() => {
		ctx.idle.clear();
	});
}

