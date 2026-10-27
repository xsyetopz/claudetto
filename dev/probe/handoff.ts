// The handoff text of the base session, which the arm H of the probe resumes from.

import {
	type HandoffInput,
	handoffText,
} from "../../plugins/claudetto/modules/session/handoff/handover.ts";
import { HANDOVER_RESUME } from "../../plugins/claudetto/modules/session/handoff/prompts.ts";
import type { Base, Event } from "./events.ts";

/** The messages of the base session as the handover reads them: each prompt, then the assistant messages of its step. */
export const messagesOf = (
	prompts: string[],
	steps: Event[][],
): HandoffInput["messages"] =>
	steps.flatMap((events, i) => [
		{ role: "user" as const, text: prompts[i] ?? "", toolUses: [] },
		...events
			.filter((e) => e.type === "assistant")
			.map((e) => {
				const content = e.message?.content ?? [];
				return {
					role: "assistant" as const,
					text: content.flatMap((b) => (b.text ? [b.text] : [])).join("\n"),
					toolUses: content.flatMap((b) =>
						b.type === "tool_use"
							? [
									{
										tool_use_id: b.id ?? "",
										tool: b.name ?? "",
										input: b.input ?? {},
									},
								]
							: [],
					),
				};
			}),
	]);

/** The handoff text of the base session, built by the code of the plugin with no model call. */
export const handoffOf = (
	messages: HandoffInput["messages"],
	tasks: string,
): string => handoffText({ messages, name: "demo", tasks });

/** The first prompt of the new session of H: the resume text of the handover, then the handoff. */
export const resumeOf = (text: string, file: string): string =>
	[HANDOVER_RESUME({ path: file }), "", text].join("\n");

export interface Start {
	id: string;
	base: Base;
	handoff: string;
	/** The context of the base session, in tokens: the input sum of its last request. */
	context: number;
}
