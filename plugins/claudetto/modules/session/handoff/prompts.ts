/** The first lines of a handoff. `# Handoff` is also the mark that finds an earlier handoff in a transcript. */
export const HANDOFF_TITLE = "# Handoff";

export const HANDOFF_INTRO = `This is the state of the earlier part of this session. Code built it from the transcript, and no model wrote it.
Treat each line under \`## Constraints and Pins\` as a rule that is still in force.
Treat a task as done only when \`## Open Change and Tasks\` lists it as done.`;

/** The instructions of `/compact`: the summary keeps the facts that a handover keeps. */
export const COMPACT_KEEP = (v: { text: string }): string =>
	`Keep each fact below in the summary as it is, because the session continues from them.

${v.text}`;

export const HANDOVER_HELD = (v: { prompt: string }): string =>
	`The user wrote this prompt before claudetto cleared or compacted the context, and claudetto held it until that was complete. It is the newest prompt of the user:

${v.prompt}`;

export const HANDOVER_NOTICE = (v: { file: string }): string =>
	`Handover: the handoff is in ${v.file}, then the session clears and resumes on it.`;

export const OFFER_QUESTION =
	"The prompt cache is cold, so the next request pays the full price of the context. A handover clears the context and resumes on a short handoff file. Is a handover better than a continued session, given the size of the context and the open task?";

export const OFFER_STATE = (v: {
	tokens: string;
	idle: string;
	ttl: string;
	task: string;
}): string => `Context: ${v.tokens} tokens.
Idle: ${v.idle}. The prompt cache lasts ${v.ttl} minutes, so it is cold.
Open task: ${v.task}`;

export const HANDOVER_OFFER = (v: { minutes: string }): string =>
	`The last answer was more than ${v.minutes} minutes ago, so the prompt cache is cold. Hand the session over to a fresh context with a handoff file?`;

export const HANDOVER_OFFER_RESUMED =
	"This session was resumed, so the time of the last answer is not known, and the prompt cache can be cold. Hand the session over to a fresh context with a handoff file?";

export const HANDOVER_HELD_NOTICE = "The prompt runs after the handover.";

export const HANDOVER_RESUME = (v: { path: string }): string =>
	[
		`This is the handoff of the earlier part of this session, from \`${v.path}\`.`,
		"The session was cleared, and the old session stays on disk for `/resume`.",
		"Code built the handoff from the state of the session, so it has no model summary.",
		"Treat a task as done only when the handoff lists it as done.",
		"Continue from the next open task.",
	].join("\n");

export const OPTION_DESCRIPTION =
	"Use `auto` to pick a handover or a compaction for each case from the table, `handover` to hand over at each trigger, `built-in` for the compaction of Claude Code, or `code` for a compaction that code builds with no model request.";

export const SWITCH_COST = (v: { tokens: string; usd: string }): string =>
	`The new model must write about ${v.tokens} tokens to its cache again, which costs about $${v.usd}.`;

export const SWITCH_WARNING = (v: { ttl: string; model: string }): string =>
	`The \`${v.ttl}\` prompt cache is warm, and this switch to \`${v.model}\` drops it.`;
