import { redactWith, secretsIn } from "../secrets.ts";
import type { Host, State } from "./questions.ts";

/** The most characters of state sent to Jev; a longer state goes to the fallback. */
export const STATE_MAX_CHARS = 200_000;

/**
 * Every field of `state` with its secrets replaced.
 * One scan reads the fields as raw text joined by line breaks, because the line rules match a line start and not a JSON string.
 * Rejects when the scanner fails.
 */
export async function redactedState(
	$: Pick<Host, "process">,
	state: State,
): Promise<State> {
	const secrets = await secretsIn(
		(argv, init) => $.process.run(argv, init),
		Object.values(state).join("\n"),
	);
	return Object.fromEntries(
		Object.entries(state).map(([name, text]) => [
			name,
			redactWith(text, secrets),
		]),
	);
}
