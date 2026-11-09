import { gitLines, HANDOFF_SECTIONS, layout } from "./layout.ts";

const text = (description: string) => ({ type: "string", description });

export const HANDOFF_INPUT_SCHEMA = {
	type: "object",
	properties: {
		goal: text("What the work is for."),
		standing: text("The user's standing instructions, in your words."),
		state: text("What is done and what is not, each with its proof."),
		decisions: text("Each decision and its reason."),
		next_prompt: text("The prompt that starts the next window."),
	},
	required: ["goal", "standing", "state", "decisions", "next_prompt"],
} as const;

interface HandoffFields {
	readonly goal: string;
	readonly standing: string;
	readonly state: string;
	readonly decisions: string;
	readonly nextPrompt: string;
}

const asText = (value: unknown): string =>
	typeof value === "string" ? value.trim() : "";

/** `missing` names the fields the model left out. */
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
	const missing = Object.entries({
		goal: fields.goal,
		standing: fields.standing,
		state: fields.state,
		decisions: fields.decisions,
		next_prompt: fields.nextPrompt,
	})
		.filter(([, value]) => value === "")
		.map(([name]) => name);
	return missing.length > 0 ? { missing } : { fields };
};

export const toolHandoffText = (
	fields: HandoffFields,
	at: string,
	git: string,
): string => {
	const body: Readonly<Record<string, string>> = {
		Goal: fields.goal,
		"Standing Instructions": fields.standing,
		"Decisions Log": fields.decisions,
		"Current State": fields.state,
		"Next Steps": fields.nextPrompt,
	};
	return layout(`Written by Claude at ${at}.`, (section) =>
		HANDOFF_SECTIONS.includes(section)
			? [
					body[section] ?? "None given.",
					"",
					...(section === "Current State" ? gitLines(git, at) : []),
				]
			: [],
	);
};
