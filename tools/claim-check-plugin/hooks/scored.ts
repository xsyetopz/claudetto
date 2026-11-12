// What a tuning scorer hands back. The engine loads this module, so it uses no Bun or node API.
import { field, lines } from "../../claim-check-prices.ts";
import type { Findings, Row } from "../../claim-check-report.ts";
import { type Ctx, eachCase } from "./client.ts";

/** The roads a scorer scored and the lines it adds to the summary. */
export type Scored = Pick<Findings, "title" | "roads" | "extra">;

/** A stored case of a Decider road: the codes it expects. */
export interface DeciderCase {
	expected: string[];
}

/** How one Decider road reads its cases and asks the Decider about one. */
export interface DeciderRoad<T extends DeciderCase> {
	title: string;
	scope: string[];
	asCase: (raw: unknown, input: unknown) => T;
	found: (c: T) => Promise<string[]>;
}

/** Scores each stored case of `road`, one Decider road, stopping when `ctx` stops. */
export async function scoreDecider<T extends DeciderCase>(
	ctx: Ctx,
	text: string,
	road: DeciderRoad<T>,
): Promise<Scored> {
	const rows: Row[] = [];
	await eachCase(
		ctx,
		lines(text).map((line) => {
			const raw: unknown = JSON.parse(line);
			return {
				id: String(field(raw, "id")),
				c: road.asCase(raw, field(raw, "input")),
			};
		}),
		async ({ id, c }) => {
			ctx.caseId = id;
			ctx.label = "decider-fallback";
			ctx.sent = 0;
			const found = await road.found(c);
			if (!ctx.stopped) {
				rows.push({ id, expected: c.expected, found });
			}
		},
	);
	return {
		title: road.title,
		roads: new Map([["decider", { scope: road.scope, rows }]]),
		extra: [],
	};
}
