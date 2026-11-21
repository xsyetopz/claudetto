import type { On } from "claude-code";

import { fault } from "../shared/fault";
import { fieldOf } from "../shared/field";

/** The reminder that follows the answers; the option text is the agent's, not the user's. */
export const NOT_A_GRANT =
	"Option labels and descriptions are the agent's wording, not the user's statements: a number, budget, limit or scope that appears only in option text is not a user grant.";

/** The labels of one question's options, from the AskUserQuestion input. */
const labelsOf = (question: unknown): string[] => {
	const options = fieldOf(question, "options");
	if (!Array.isArray(options)) {
		return [];
	}
	return options
		.map((option: unknown) => fieldOf(option, "label"))
		.filter((label): label is string => typeof label === "string");
};

/**
 * Splits one answer into the option labels it names and the text the user typed.
 * A multi-select answer joins labels with commas (code.claude.com/docs/en/hooks.md,
 * AskUserQuestion `answers`); a free-text answer ("Other") is not among the labels.
 */
export const splitAnswer = (
	answer: string,
	labels: readonly string[]
): { selected: string[]; typed: string } => {
	if (labels.includes(answer)) {
		return { selected: [answer], typed: "" };
	}
	const selected: string[] = [];
	let rest = answer;
	for (const label of labels.toSorted((a, b) => b.length - a.length)) {
		if (rest.includes(label)) {
			selected.push(label);
			rest = rest.replace(label, "");
		}
	}
	const leftover = rest.split(",").some((part) => part.trim() !== "");
	// A mixed answer counts as labels only when nothing else is left over.
	if (leftover || selected.length === 0) {
		return { selected: [], typed: answer };
	}
	return { selected, typed: "" };
};

/**
 * The note after an AskUserQuestion call: per question, the labels the user
 * selected and the text the user typed, then the reminder that option text is
 * the agent's. Undefined when the response carries no answer.
 */
export const answerNote = (
	toolInput: unknown,
	toolResponse: unknown
): string | undefined => {
	const answers = fieldOf(toolResponse, "answers");
	const asked = fieldOf(toolInput, "questions");
	const questions: unknown[] = Array.isArray(asked) ? asked : [];
	const lines: string[] = [];
	if (typeof answers === "object" && answers !== null) {
		for (const [text, answer] of Object.entries(answers)) {
			if (typeof answer !== "string") {
				continue;
			}
			const question = questions.find(
				(item) => fieldOf(item, "question") === text
			);
			const header = fieldOf(question, "header");
			const name = typeof header === "string" ? header : text;
			const { selected, typed } = splitAnswer(answer, labelsOf(question));
			const parts = [
				...(selected.length > 0
					? [`selected ${selected.map((l) => `"${l}"`).join(", ")}`]
					: []),
				...(typed === "" ? [] : [`typed "${typed}"`])
			];
			lines.push(`- ${name}: ${parts.join("; ") || "no answer"}`);
		}
	}
	const response = fieldOf(toolResponse, "response");
	if (typeof response === "string" && response.trim() !== "") {
		lines.push(`- free text: typed "${response.trim()}"`);
	}
	if (lines.length === 0) {
		return undefined;
	}
	return `The user's answers:\n${lines.join("\n")}\n${NOT_A_GRANT}`;
};

/**
 * Adds the answer note beside an AskUserQuestion result (PostToolUse
 * `additionalContext`; it blocks nothing). The `tool_name` matcher keeps every
 * other tool's call out of the hook.
 */
export function registerAnswerNote(on: On): void {
	on(
		"classic.PostToolUse",
		{ tool_name: "AskUserQuestion" },
		async (_$, e, next) => {
			const result = await next(e);
			const note = answerNote(e.tool_input, e.tool_response);
			if (note === undefined) {
				return result;
			}
			return {
				...result,
				additionalContext: [...(result.additionalContext ?? []), note]
			};
		}
	).catch(($, e, next) => {
		fault($, "question answer note", next.error);
		return next(e);
	});
}
