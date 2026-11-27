/** Prompt submission: counts the person's prompts and may send a read note along with one. */

import type { EngineInterface, On } from "claude-code";

import { isPersonsPrompt } from "../check/backoff";
import type { Ctx } from "../shared/context";
import { fault } from "../shared/fault";
import { countAndSend, type Pending } from "./autosend";
import { clearOffLine, isOffCommand, ranOffCommand } from "./off";

/** Tells the person a note went with their prompt; the note went whether or not the log did. */
function logSentNote($: EngineInterface): void {
	try {
		$.ui.log("Sent a note to Claude with your prompt");
	} catch (error) {
		// the note went either way
		fault($, "sent-note log", error);
	}
}

export function registerSubmit(on: On, ctx: Ctx): void {
	// Fail open: a throwing hook must not block the prompt or the command; pass the event on unchanged.
	on("prompt.submit", async ($, e, next) => {
		const glance = {
			snapshot: new Map(ctx.idle),
			now: Date.now(),
			isAborted: () => next.signal.aborted
		};
		const kind = e.origin.kind;
		const pending: Pending = { note: undefined };
		if (isPersonsPrompt(kind)) {
			void clearOffLine($, ctx.off, { isConfirmed: isOffCommand(e.text) });
			const isPlain = e.turnId === undefined && e.command === undefined;
			await countAndSend(
				$,
				ctx,
				{ text: e.text, kind, isPlain },
				glance,
				pending
			);
		}
		if (pending.note === undefined) {
			return next(e);
		}
		const result = await next({
			...e,
			context: [...(e.context ?? []), pending.note]
		});
		if (result.drop === undefined) {
			logSentNote($);
		}
		return result;
	}).catch(($, e, next) => {
		fault($, "`prompt.submit`", next.error);
		return next(e);
	});
}

export function registerCommand(on: On, ctx: Ctx): void {
	// Fail open: a throwing hook must not block the prompt or the command; pass the event on unchanged.
	on("command.run", { command: "plugin" }, async ($, e, next) => {
		if (
			isPersonsPrompt(e.origin.kind) &&
			isOffCommand(`/${e.command} ${e.args}`)
		) {
			await ranOffCommand($, ctx.off);
		}
		return next(e);
	}).catch(($, e, next) => {
		fault($, "`command.run`", next.error);
		return next(e);
	});
}
