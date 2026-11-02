import { redact } from "../../shared/secrets/redact.ts";
import { HANDOFF_CALL, HANDOFF_SECTIONS, layout } from "./handoff.ts";

export const HANDOFF_MATCH = { tool: [HANDOFF_CALL] } as const;

const text = (description: string) => ({ type: "string", description });

/** Short descriptions: the entry is fetched into every session that hands off, and the tool text carries the rest. */
export const HANDOFF_INPUT_SCHEMA = {
	type: "object",
	properties: {
		goal: text("What the work is for."),
		standing: text("The user's recent prompts, re-worded in your own words."),
		state: text("What is done and what is not, each with its proof."),
		decisions: text("Each decision and its reason."),
		next_prompt: text("The prompt that starts the next window."),
	},
	required: ["goal", "standing", "state", "decisions", "next_prompt"],
} as const;

export const TOOL_HANDOFF =
	"Ends this window with a handoff and starts a fresh one from it. Call it when the work in hand is done. Write `[REDACTED]` for a key or a token.";

export interface HandoffFields {
	readonly goal: string;
	readonly standing: string;
	readonly state: string;
	readonly decisions: string;
	readonly nextPrompt: string;
}

const asText = (value: unknown): string =>
	typeof value === "string" ? value.trim() : "";

/** `missing` names the fields the model left out, so the call can tell it which. */
export const fieldsOf = (
	input: Readonly<Record<string, unknown>>,
):
	| { readonly fields: HandoffFields }
	| { readonly missing: readonly string[] } => {
	const fields: HandoffFields = {
		goal: asText(input["goal"]),
		standing: asText(input["standing"]),
		state: asText(input["state"]),
		decisions: asText(input["decisions"]),
		nextPrompt: asText(input["next_prompt"]),
	};
	const missing = [
		["goal", fields.goal],
		["standing", fields.standing],
		["state", fields.state],
		["decisions", fields.decisions],
		["next_prompt", fields.nextPrompt],
	]
		.filter(([, value]) => value === "")
		.map(([name]) => String(name));
	return missing.length > 0 ? { missing } : { fields };
};

const paragraph = (value: string): string[] => [redact(value), ""];

export const toolHandoffText = (fields: HandoffFields, at: string): string => {
	const body: Readonly<Record<string, readonly string[]>> = {
		Goal: paragraph(fields.goal),
		"Standing instructions": paragraph(fields.standing),
		"Decisions log": paragraph(fields.decisions),
		"Current state": paragraph(fields.state),
		"Next steps": paragraph(fields.nextPrompt),
	};
	return layout(`Written by Claude at ${at}.`, (section) =>
		HANDOFF_SECTIONS.includes(section)
			? (body[section] ?? ["None given.", ""])
			: [],
	);
};
