// Scores the stored reply-register cases through the Decider's `REPLY_REGISTER` questions, on the engine's `$`. The engine loads this module, so it uses no Bun or node API.
import { REPLY_REGISTER } from "../../../plugins/claudetto/hooks/decider/questions.ts";
import { settle } from "../../../plugins/claudetto/hooks/decider/settle.ts";
import { field, lines, strings } from "../../claim-check-prices.ts";
import type { Findings } from "../../claim-check-report.ts";
import { type Ctx, eachCase, type Engine, host } from "./client.ts";
import type { Scored } from "./scored.ts";

const FAULTS = Object.keys(REPLY_REGISTER.questions);

const asCase = (line: string) => {
	const raw: unknown = JSON.parse(line);
	const input = field(raw, "input");
	return {
		id: String(field(raw, "id")),
		expected: strings(field(raw, "expected")).toSorted(),
		state: {
			person_message: String(field(input, "person")),
			reply: String(field(input, "reply")),
			checks: strings(field(input, "checks")).join("\n") || "none",
		},
	};
};

type Case = ReturnType<typeof asCase>;

async function scoreCase(
	$: Engine,
	ctx: Ctx,
	c: Case,
	roads: Findings["roads"],
): Promise<void> {
	ctx.caseId = c.id;
	ctx.label = "decider-fallback";
	ctx.sent = 0;
	const answers = await settle(host($, ctx), REPLY_REGISTER, c.state);
	if (ctx.stopped) {
		return;
	}
	roads.get("decider")?.rows.push({
		id: c.id,
		expected: c.expected,
		found: FAULTS.filter((name) => answers[name] === "yes").toSorted(),
	});
}

/** Scores each reply-register case: the faults the questions answer `yes` to, against the hand-written list. */
export async function scoreReply(
	$: Engine,
	ctx: Ctx,
	text: string,
): Promise<Scored> {
	const roads: Findings["roads"] = new Map([
		["decider", { scope: FAULTS, rows: [] }],
	]);
	await eachCase(
		ctx,
		lines(text).map((line) => asCase(line)),
		(c) => scoreCase($, ctx, c, roads),
	);
	return { title: "Reply-Register Run", roads, extra: [] };
}
