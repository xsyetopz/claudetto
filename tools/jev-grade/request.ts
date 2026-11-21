import { type JevConfig, MODEL } from "./config";

/** The Jev request body. */
export interface JevRequest {
	readonly model: string;
	readonly state: {
		readonly task: string;
		readonly facts: JevConfig["facts"];
		readonly reply: string;
	};
	readonly questions: Readonly<
		Record<
			string,
			{
				readonly type: "noul";
				readonly instructions: string;
				readonly criteria?: { readonly true: string; readonly false: string };
			}
		>
	>;
}

/**
 * Replaces home paths so no user name leaves the machine.
 *
 * @param text Any text.
 * @returns The text with `/Users/<name>` as `~`.
 */
export const redact = (text: string): string =>
	text.replaceAll(/\/Users\/[^/\s"'`)]+/gu, "~");

/**
 * Builds one run's request: the case's questions over the task, facts and final reply.
 *
 * @param config The case's `jev.yaml`.
 * @param task The case prompt.
 * @param reply The run's final reply.
 * @returns The exact body to POST.
 */
export function buildRequest(
	config: JevConfig,
	task: string,
	reply: string
): JevRequest {
	const facts =
		typeof config.facts === "string"
			? redact(config.facts)
			: config.facts.map(redact);
	return {
		model: MODEL,
		state: { task: redact(task), facts, reply: redact(reply) },
		questions: Object.fromEntries(
			Object.entries(config.questions).map(([id, question]) => [
				id,
				{
					type: "noul" as const,
					instructions: question.instructions,
					...(question.criteria === undefined
						? {}
						: { criteria: question.criteria })
				}
			])
		)
	};
}
