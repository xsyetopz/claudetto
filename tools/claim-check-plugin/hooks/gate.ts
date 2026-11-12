// Scores the stored branch-gate cases through the gate's own `askedToDelete`, on the engine's `$`. The engine loads this module, so it uses no Bun or node API.
import { askedToDelete } from "../../../plugins/claudetto/hooks/gate/asked.ts";
import { field, strings } from "../../claim-check-prices.ts";
import { type Ctx, type Engine, host } from "./client.ts";
import { type Scored, scoreDecider } from "./scored.ts";

const DELETE = "delete";

const codes = (asked: boolean): string[] => (asked ? [DELETE] : []);

const asCase = (raw: unknown, input: unknown) => ({
	expected: codes(field(raw, "expected") === true),
	said: strings(field(input, "said")),
	branch: String(field(input, "branch")),
});

/** Scores each branch-gate case through the gate's `askedToDelete`. */
export const scoreGate = ($: Engine, ctx: Ctx, text: string): Promise<Scored> =>
	scoreDecider(ctx, text, {
		title: "Branch-Gate Run",
		scope: [DELETE],
		asCase,
		found: async (c) =>
			codes(await askedToDelete(host($, ctx), c.said, c.branch)),
	});
