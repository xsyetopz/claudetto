/** The element table rows draw with, plus the surface's lead ink and composer rules. */

import type { Elements } from "claude-code";

export type Look = {
	readonly color?: string;
	readonly dimColor?: boolean;
};

export type LeadInk = { readonly star: Look; readonly tag: Look };

export type Table = Elements["terminal"] & {
	readonly leadInk?: LeadInk;
	readonly hasStarColumn?: boolean;
};

export const ACCENT_LEAD_INK: LeadInk = {
	star: { color: "suggestion" },
	tag: { dimColor: true },
};
export const MUTED_LEAD_INK: LeadInk = {
	star: { color: "subtle" },
	tag: { color: "subtle" },
};
const LEAD_INK: Readonly<Record<string, LeadInk>> = {
	terminal: ACCENT_LEAD_INK,
	desktop: MUTED_LEAD_INK,
	mobile: ACCENT_LEAD_INK,
	vscode: ACCENT_LEAD_INK,
};
const OWN_COMPOSER: Readonly<Record<string, boolean>> = {
	terminal: false,
	desktop: true,
	mobile: true,
	vscode: true,
};

export const hasOwnComposer = (surface: string): boolean =>
	!Object.hasOwn(OWN_COMPOSER, surface) || OWN_COMPOSER[surface] === true;

export const leadInkOf = (table: { readonly leadInk?: LeadInk }): LeadInk =>
	table.leadInk ?? ACCENT_LEAD_INK;

export function leadInkOn(surface: string): LeadInk {
	return LEAD_INK[surface] ?? ACCENT_LEAD_INK;
}

/** The table for `surface`: a surface with its own composer has no hotkeys and no star column. */
export function rowsTable(surface: string, resolved: Elements[keyof Elements]): Table {
	const elements = resolved as Elements["terminal"];
	const leadInk = leadInkOn(surface);
	if (hasOwnComposer(surface)) {
		const Button = (props: Record<string, unknown>) => {
			const { hotkey: _hotkey, plain: _plain, ...rest } = props;
			return (elements.Button as unknown as (p: unknown) => unknown)(rest);
		};
		return {
			...elements,
			Button: Button as unknown as Elements["terminal"]["Button"],
			leadInk,
			hasStarColumn: false,
		};
	}
	return { ...elements, leadInk, hasStarColumn: true };
}
