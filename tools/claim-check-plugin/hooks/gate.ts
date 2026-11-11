// Scores the stored branch-gate cases through the gate's own `askedToDelete`, on the engine's `$`. The engine loads this module, so it uses no Bun or node API.
import { askedToDelete } from "../../../plugins/claudetto/hooks/gate/asked.ts";
import { field, lines, strings } from "../../claim-check-prices.ts";
import type { Findings } from "../../claim-check-report.ts";
import { type Ctx, eachCase, type Engine, host } from "./client.ts";
import type { Scored } from "./scored.ts";

const DELETE = "delete";

const asCase = (line: string) => {
	const raw: unknown = JSON.parse(line);
	const input = field(raw, "input");
	return {
		id: String(field(raw, "id")),
		expected: field(raw, "expected") === true,
		said: strings(field(input, "said")),
		branch: String(field(input, "branch")),
	};
};

type Case = ReturnType<typeof asCase>;

const codes = (asked: boolean): string[] => (asked ? [DELETE] : []);

async function scoreCase(
	$: Engine,
	ctx: Ctx,
	c: Case,
	roads: Findings["roads"],
): Promise<void> {
	ctx.caseId = c.id;
	ctx.label = "decider-fallback";
	ctx.sent = 0;
	const asked = await askedToDelete(host($, ctx), c.said, c.branch);
	if (ctx.stopped) {
		return;
	}
	roads.get("decider")?.rows.push({
		id: c.id,
		expected: codes(c.expected),
		found: codes(asked),
	});
}

/** Scores each branch-gate case through the gate's `askedToDelete`. */
export async function scoreGate(
	$: Engine,
	ctx: Ctx,
	text: string,
): Promise<Scored> {
	const roads: Findings["roads"] = new Map([
		["decider", { scope: [DELETE], rows: [] }],
	]);
	await eachCase(
		ctx,
		lines(text).map((line) => asCase(line)),
		(c) => scoreCase($, ctx, c, roads),
	);
	return { title: "Branch-Gate Run", roads, extra: [] };
}
