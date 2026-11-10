const DELETES = /\b(?:delete|remove|drop|prune)\b/iu;
const NEGATED = /\b(?:not|never|no)\b|n't\b/iu;
const OTHER_BRANCHES = /\b(?:other|all)\b.*\bbranches\b/iu;
const escaped = (s: string): string =>
	s.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);

const sentencesOf = (texts: readonly string[]): string[] =>
	texts.flatMap((t) => t.split(/[.!?]\s+|\n/u));

// "Do not delete old-feature" names the branch too, so a sentence counts only when it asks for the delete and does not forbid it.
const asksDelete = (sentence: string, branch: string): boolean =>
	DELETES.test(sentence) &&
	!NEGATED.test(sentence) &&
	(OTHER_BRANCHES.test(sentence) ||
		new RegExp(
			`(?:^|[\\s\`'"])${escaped(branch)}(?:$|[\\s\`'".,;:!?])`,
			"u",
		).test(sentence));

/** Tells whether a message of the person asks to delete the branch, by its name or as one of "the other branches". */
export const askedToDelete = (
	said: readonly string[],
	branch: string,
): boolean => sentencesOf(said).some((s) => asksDelete(s, branch));
