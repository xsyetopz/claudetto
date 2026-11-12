import type { EngineInterface } from "claude-code";

import { SHIPPED_REGISTER } from "../../decider/questions.ts";
import { redactedState } from "../../decider/redact.ts";
import { settle } from "../../decider/settle.ts";
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
	// The fallback model reads the state as given, so it is redacted first; a scanner that fails leaves the reply unchecked.
	const safe = await redactedState($, {
		person_message: turn.user,
		reply,
		checks: turn.results.join("\n") || "none",
	}).catch(() => null);
	if (safe === null) {
		return undefined;
	}
	const answers = await settle($, SHIPPED_REGISTER, safe);
	return Object.values(answers).includes("yes") ? REGISTER_BLOCK : undefined;
}
