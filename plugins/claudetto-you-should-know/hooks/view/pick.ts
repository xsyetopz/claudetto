/** Picks the element for the band: the stored view's row, with the debug log above it when it is on. */

import type { EngineInterface, RenderElement } from "claude-code";

import { toggleAbout } from "../shared/store";
import { actionsFor } from "./actions";
import type { RowArgs } from "./bind/args";
import { aboutKeyOf } from "./copy";
import type { Flags } from "./flags";
import type { Band } from "./idle";
import { debugRows } from "./parts/status";
import { rowFor } from "./row";

export interface Drawing extends Pick<
	RowArgs,
	"view" | "sid" | "tag" | "table" | "ctx" | "isOptIn"
> {
	readonly e: Band;
	readonly about: string | undefined;
	readonly checks: Flags["checks"];
}

const isElement = (node: unknown): node is RenderElement =>
	typeof node === "object" && node !== null;

/** The element to draw, or `undefined` when the engine's own band should show. */
export function pickElement(
	$: EngineInterface,
	p: Drawing
): RenderElement | undefined {
	const { e, view, sid } = p;
	const picked = rowFor({
		view,
		sid,
		tag: p.tag,
		surface: e.surface,
		props: e.props,
		table: p.table,
		actions: actionsFor($, sid, p.ctx),
		ctx: p.ctx,
		isOptIn: p.isOptIn,
		isAboutOpen: view?.kind === "offer" && p.about === aboutKeyOf(view),
		toggleAbout: (key) => {
			void toggleAbout($, { sid, key });
		}
	});
	const shown =
		p.checks.length > 0 && !e.props.hasSurvey
			? debugRows(p.table, p.checks, picked)
			: picked;
	return isElement(shown) ? shown : undefined;
}
