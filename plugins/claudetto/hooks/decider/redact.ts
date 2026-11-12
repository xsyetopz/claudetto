import { redactWith, secretsIn } from "../secrets";
import type { Host, State } from "./questions";

/**
 * The most characters of state sent to Jev; a longer state goes to the fallback.
 * Jev takes 64,000 tokens per request. Session text measured about 2.8 characters per token, and a log or code runs denser,
 * so the bound counts 2 characters per token and leaves the rest for the questions.
 */
export const STATE_MAX_CHARS = 120_000;

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
