/** Prompt submission: counts the person's prompts and may send a read note along with one. */

import type { On } from "claude-code";

import { isPersonsPrompt, mayBeDriven, switchOf } from "./backoff";
import type { Ctx } from "./context";
import { aboutKeyOf } from "./copy";
import { autoSentNote, respondDraft } from "./draft";
import { clearOffLine, isOffCommand, ranOffCommand } from "./off";
import { tagOf } from "./parse";
import { isNoteRead, isOpenView, rowOf, type Watched, withViewCleared } from "./session-rows";
import { markKnown } from "./store";
import { fault } from "./fault";

export function registerSubmit(on: On, ctx: Ctx): void {
	// Fail open: a throwing hook must not block the prompt or the command; pass the event on unchanged.
	on("prompt.submit", async ($, e, next) => {
		const now = Date.now();
		const snapshot = new Map<string, Watched>(ctx.idle);
		const kind = e.origin.kind;
		let pending: string | undefined;
		if (isPersonsPrompt(kind)) {
			void clearOffLine($, ctx.off, { isConfirmed: isOffCommand(e.text) });
			try {
				const surfaces = await $.session.surfaces();
				if (surfaces.length > 0) {
					const sid = await $.session.id();
					const count = (ctx.promptsSince.get(sid)?.count ?? 0) + 1;
					ctx.promptsSince.set(sid, { origin: kind, count });
					if (kind === "bridge") {
						ctx.bridge.add(sid);
					} else {
						ctx.bridge.delete(sid);
					}
					const isPlain = e.turnId === undefined && e.command === undefined;
					const isTerminalComposer = kind === "composer" && surfaces.includes("terminal");
					const trimmed = e.text.trim();
					const isDigit = trimmed.length === 1 && /^\d$/.test(trimmed.normalize("NFKC"));
					if (
						isTerminalComposer &&
						(isDigit || (isPlain && ctx.idle.has(sid))) &&
						(await switchOf($.env.get("CLAUDE_CODE_YOU_SHOULD_KNOW_AUTO_SEND"))) &&
						!(await mayBeDriven($))
					) {
						const rows = await $.store.get("sessions");
						const row = rowOf(rows, sid);
						const view = row?.view;
						if (isDigit && isOpenView(view)) {
							ctx.autoSent.add(aboutKeyOf(view));
						}
						if (
							isOpenView(view) &&
							isNoteRead(snapshot.get(sid), view, now) &&
							isNoteRead(ctx.idle.get(sid), view, now) &&
							!ctx.autoSent.has(aboutKeyOf(view)) &&
							!next.signal.aborted
						) {
							ctx.autoSent.add(aboutKeyOf(view));
							const tag = tagOf(row?.tag ?? "");
							pending = autoSentNote(respondDraft(view.line, [], tag));
							await $.store.set("sessions", withViewCleared(rows, sid));
							$.ui.invalidate("ui.render");
							await markKnown($, view.line);
						}
					}
				}
			} catch (err) {
				// a failed look sends the prompt as it was
				fault($, "prompt submit", err);
			}
		}
		if (pending === undefined) {
			return next(e);
		}
		const result = await next({ ...e, context: [...(e.context ?? []), pending] });
		if (result.drop === undefined) {
			try {
				$.ui.log("Sent a note to Claude with your prompt");
			} catch (err) {
				// the note went either way
				fault($, "sent-note log", err);
			}
		}
		return result;
	}).catch(($, e, next) => {
		fault($, "prompt.submit", next.error);
		return next(e);
	});
}

export function registerCommand(on: On, ctx: Ctx): void {
	// Fail open: a throwing hook must not block the prompt or the command; pass the event on unchanged.
	on("command.run", { command: "plugin" }, async ($, e, next) => {
		if (isPersonsPrompt(e.origin.kind) && isOffCommand(`/${e.command} ${e.args}`)) {
			await ranOffCommand($, ctx.off);
		}
		return next(e);
	}).catch(($, e, next) => {
		fault($, "command.run", next.error);
		return next(e);
	});
}

