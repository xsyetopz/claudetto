/** Counts a person's prompt and, when the note on screen was read, sends it along with the prompt. */

import type { EngineInterface } from "claude-code";

import { mayBeDriven, switchOf } from "../check/backoff";
import { tagOf } from "../request/parse";
import type { Ctx } from "../shared/context";
import { fault } from "../shared/fault";
import { markKnown } from "../shared/store";
import { aboutKeyOf } from "../view/copy";
import { autoSentNote, respondDraft } from "../view/draft";
import {
	isNoteRead,
	isOpenView,
	rowOf,
	type Watched,
	withViewCleared
} from "./rows";

/** The note to send along, set the moment it is chosen so a later fault still sends it. */
export interface Pending {
	note: string | undefined;
}

/** The prompt as the count and the send read it. */
export interface Typed {
	readonly text: string;
	readonly kind: string;
	/** True for a prompt typed between turns, not a command. */
	readonly isPlain: boolean;
}

/** The band's idle state when the prompt arrived. */
export interface Glance {
	readonly snapshot: ReadonlyMap<string, Watched>;
	readonly now: number;
	readonly isAborted: () => boolean;
}

const isDigitText = (text: string): boolean => {
	const trimmed = text.trim();
	return trimmed.length === 1 && /^\d$/u.test(trimmed.normalize("NFKC"));
};

function countPrompt(ctx: Ctx, sid: string, kind: string): void {
	const count = (ctx.promptsSince.get(sid)?.count ?? 0) + 1;
	ctx.promptsSince.set(sid, { origin: kind, count });
	if (kind === "bridge") {
		ctx.bridge.add(sid);
	} else {
		ctx.bridge.delete(sid);
	}
}

async function mayAutoSend(
	$: EngineInterface,
	ctx: Ctx,
	sid: string,
	surfaces: readonly string[],
	typed: Typed
): Promise<boolean> {
	const isTerminalComposer =
		typed.kind === "composer" && surfaces.includes("terminal");
	return (
		isTerminalComposer &&
		(isDigitText(typed.text) || (typed.isPlain && ctx.idle.has(sid))) &&
		(await switchOf($.env.get("CLAUDE_CODE_YOU_SHOULD_KNOW_AUTO_SEND"))) &&
		!(await mayBeDriven($))
	);
}

async function sendReadNote(
	$: EngineInterface,
	ctx: Ctx,
	sid: string,
	typed: Typed,
	glance: Glance,
	pending: Pending
): Promise<void> {
	const rows = await $.store.get("sessions");
	const row = rowOf(rows, sid);
	const view = row?.view;
	if (isDigitText(typed.text) && isOpenView(view)) {
		ctx.autoSent.add(aboutKeyOf(view));
	}
	if (
		!isOpenView(view) ||
		!isNoteRead(glance.snapshot.get(sid), view, glance.now) ||
		!isNoteRead(ctx.idle.get(sid), view, glance.now) ||
		ctx.autoSent.has(aboutKeyOf(view)) ||
		glance.isAborted()
	) {
		return;
	}
	ctx.autoSent.add(aboutKeyOf(view));
	pending.note = autoSentNote(
		respondDraft(view.line, [], tagOf(row?.tag ?? ""))
	);
	await $.store.set("sessions", withViewCleared(rows, sid));
	$.ui.invalidate("ui.render");
	await markKnown($, view.line);
}

/** Fails open: a faulty look logs and leaves the prompt as it was. */
export async function countAndSend(
	$: EngineInterface,
	ctx: Ctx,
	typed: Typed,
	glance: Glance,
	pending: Pending
): Promise<void> {
	try {
		const surfaces = await $.session.surfaces();
		if (surfaces.length === 0) {
			return;
		}
		const sid = await $.session.id();
		countPrompt(ctx, sid, typed.kind);
		if (await mayAutoSend($, ctx, sid, surfaces, typed)) {
			await sendReadNote($, ctx, sid, typed, glance, pending);
		}
	} catch (error) {
		// a failed look sends the prompt as it was
		fault($, "prompt submit", error);
	}
}
