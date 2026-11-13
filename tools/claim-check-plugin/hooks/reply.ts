// Scores the stored reply-register cases through the Decider's `REPLY_REGISTER` questions, on the engine's `$`. The engine loads this module, so it uses no Bun or node API.
import { REPLY_REGISTER } from "../../../plugins/claudetto/hooks/decider/questions.ts";
import { settle } from "../../../plugins/claudetto/hooks/decider/settle.ts";
import { field, strings } from "../../claim-check-json.ts";
import { type Ctx, type Engine, host } from "./client.ts";
import { type Scored, scoreDecider } from "./scored.ts";

const FAULTS = Object.keys(REPLY_REGISTER.questions);

const asCase = (raw: unknown, input: unknown) => ({
	expected: strings(field(raw, "expected")).toSorted(),
	state: {
		person_message: String(field(input, "person")),
		reply: String(field(input, "reply")),
		checks: strings(field(input, "checks")).join("\n") || "none",
	},
});

/** Scores each reply-register case: the faults the questions answer `yes` to, against the hand-written list. */
export function scoreReply($: Engine, ctx: Ctx, text: string): Promise<Scored> {
	return scoreDecider(ctx, text, {
		title: "Reply-Register Run",
		scope: FAULTS,
		asCase,
		found: async (c) => {
			const answers = await settle(host($, ctx), REPLY_REGISTER, c.state);
			return FAULTS.filter((name) => answers[name] === "yes").toSorted();
		},
	});
}
