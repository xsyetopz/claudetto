import { BRANCH_GATE, type Host } from "../../decider/questions";
import { settle } from "../../decider/settle";

/** Tells whether the person told the assistant to delete the branch. Only a `yes` counts: a `no`, an `unsettled` answer, and a Decider that fails all leave the gate asking the person. */
export async function askedToDelete(
	$: Host,
	said: readonly string[],
	branch: string,
): Promise<boolean> {
	if (said.length === 0) {
		return false;
	}
	const answers = await settle($, BRANCH_GATE, {
		person_messages: said.map((message) => `- ${message}`).join("\n"),
		branch,
	});
	return answers["asks_delete_branch"] === "yes";
}
