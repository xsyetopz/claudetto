// The dialog draws a description under each option, but `$.ui.ask` takes labels alone, so a render hook adds them.

/** Each setup question's text to the description of each of its labels, kept from the ask until the dialog is drawn. */
const known = new Map<string, ReadonlyMap<string, string>>();

export const rememberNotes = (
	question: string,
	notes: ReadonlyMap<string, string>,
): void => {
	known.set(question, notes);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const noted = (
	option: unknown,
	notes: ReadonlyMap<string, string>,
): unknown => {
	if (!isRecord(option)) {
		return option;
	}
	const note = notes.get(String(option["label"]));
	return note === undefined ? option : { ...option, description: note };
};

/** Only a question that setup asked is changed, so another plugin's dialog is drawn as it was. */
export const withNotes = (questions: readonly unknown[]): unknown[] =>
	questions.map((question) => {
		const notes = isRecord(question)
			? known.get(String(question["question"]))
			: undefined;
		return notes === undefined || !isRecord(question)
			? question
			: {
					...question,
					options: Array.isArray(question["options"])
						? question["options"].map((option) => noted(option, notes))
						: question["options"],
				};
	});
