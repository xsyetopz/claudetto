/** A `prompt.submit` matcher for the prompts the engine stamps as the person's: typed or queued at the terminal, or sent through Remote Control. */
export const PERSON_PROMPT = {
	origin: { kind: /^(?:composer|bridge)$/ },
} as const;
