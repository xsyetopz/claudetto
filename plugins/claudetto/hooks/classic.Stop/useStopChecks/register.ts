import type { EngineInterface } from "claude-code";

import { SHIPPED_REGISTER } from "../../decider/questions.ts";
import { anyYes } from "../../decider/settle.ts";
import { REGISTER_BLOCK } from "../../texts.ts";
import { claimTurn } from "../../verify.ts";

/** The block for a reply that one Decider call answers `yes` to for any shipped register question; a `no`, an `unsettled` answer, and a Decider that fails let the reply through. */
export async function registerBlock(
	$: EngineInterface,
	e: { readonly last_assistant_message?: string | undefined },
	denied: ReadonlySet<string>,
): Promise<string | undefined> {
	const reply = e.last_assistant_message ?? "";
	if (reply === "") {
		return undefined;
	}
	const turn = claimTurn(await $.session.messages(), denied);
	const faulty = await anyYes($, SHIPPED_REGISTER, {
		person_message: turn.user,
		reply,
		checks: turn.results.join("\n") || "none",
	});
	return faulty ? REGISTER_BLOCK : undefined;
}
