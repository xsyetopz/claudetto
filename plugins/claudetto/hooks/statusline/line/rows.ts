import {
	accountTexts,
	agentTexts,
	branchText,
	cacheText,
	contextText,
	costText,
	type Ctx,
	durationText,
	linesText,
	modelText,
	nameText,
	paceTexts,
	phaseText,
	projectText,
	prText,
	type Text,
	waitingText
} from "./segments";
import { truncate, width } from "./width";

/** The gap between two items of a row: a space, a middle dot, a space. */
const SEP = " · ";

/** The most agent rows shown; the rest count as `+N`. A choice that bounds the height of the line. */
const AGENT_ROWS = 3;

/** The first row: the items that have a figure, with no label. */
const headRow = (items: readonly Text[]): string[] => {
	const shown = items.filter(Boolean).join(SEP);
	return shown === "" ? [] : [shown];
};

/** A labeled row: the dim label, then the items that have a figure; no row when none has. */
const labeled = (ctx: Ctx, label: string, items: readonly Text[]): string[] => {
	const shown = items.filter((item): item is string => Boolean(item));
	return shown.length === 0
		? []
		: [`${ctx.paint.dim(`${label}:`)} ${shown.join(SEP)}`];
};

const agentRows = (ctx: Ctx): string[] => {
	const texts = agentTexts(ctx);
	const more = texts.length - AGENT_ROWS;
	return [
		...texts.slice(0, AGENT_ROWS),
		...(more > 0 ? [ctx.paint.dim(`  +${more} more agents`)] : [])
	];
};

/** Every row, in ProjectArchitect's order: phase and model, Pace, Session, Project, Account, then what waits on the person and the running agents. */
const rowsOf = (ctx: Ctx): string[] => [
	...headRow([phaseText(ctx), modelText(ctx), contextText(ctx)]),
	...labeled(ctx, "Pace", paceTexts(ctx)),
	...labeled(ctx, "Session", [
		nameText(ctx),
		durationText(ctx),
		linesText(ctx),
		cacheText(ctx),
		costText(ctx)
	]),
	...labeled(ctx, "Project", [projectText(ctx), branchText(ctx), prText(ctx)]),
	...labeled(ctx, "Account", accountTexts(ctx)),
	...[waitingText(ctx)].filter((item): item is string => Boolean(item)),
	...agentRows(ctx)
];

/**
 * The rows that fit `columns`: clock times first, countdowns when any row is
 * too wide, and a row still too wide cut with an ellipsis.
 */
export const renderRows = (
	ctx: Omit<Ctx, "compact">,
	columns: number
): string[] => {
	const full = rowsOf({ ...ctx, compact: false });
	const rows = full.every((row) => width(row) <= columns)
		? full
		: rowsOf({ ...ctx, compact: true });
	return rows.map((row) => truncate(row, columns));
};
