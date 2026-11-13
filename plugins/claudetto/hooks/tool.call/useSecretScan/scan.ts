import type { EngineInterface } from "claude-code";

import type { CallAnswer, CallEvent, CallNext } from "../../chain";
import { redactAll, redactWith, secretsIn, stringsIn } from "../../secrets";

/** Every result is scanned, so a secret any tool prints reaches the model as `[REDACTED]`. */
export async function secretCall(
	$: EngineInterface,
	e: CallEvent,
	next: CallNext,
): Promise<Awaited<CallAnswer>> {
	const answer = await next(e);
	if (answer.deny !== undefined) {
		return answer;
	}
	// Each string is scanned raw, because JSON would escape the line breaks a rule anchors on.
	const seen = answer.text ?? stringsIn(answer.result).join("\n");
	// The tool already ran, so a thrown error would let the unscanned result through; the deny withholds it.
	let secrets: readonly string[];
	try {
		secrets = await secretsIn((argv, init) => $.process.run(argv, init), seen);
	} catch (error) {
		return { deny: error instanceof Error ? error.message : String(error) };
	}
	if (secrets.length === 0) {
		return answer;
	}
	// A hook's `{ result }` cannot carry an error, so an errored result reaches the model as a deny.
	return answer.isError
		? { deny: redactWith(seen, secrets) }
		: {
				result: redactAll(answer.result, secrets),
				...(answer.context && { context: answer.context }),
			};
}
