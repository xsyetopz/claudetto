export const JEV_QUESTION =
	"Does the reply open with agreement, praise, an apology, or self-blame? Or does it open with a sentence that the user did not ask for? Either opening takes the place of the outcome or the next action.";

export const JEV_STATE = (v: { request: string; opening: string }): string =>
	`The last request of the user:\n${v.request || "(none)"}\n\nThe opening of the reply:\n${v.opening}`;

export const OPENING_SYSTEM = `You judge the opening of a reply of a coding agent, in any language.
Answer <block>yes</block> when the opening has one of these in place of the outcome or the next action:
- Agreement, praise, an apology, or self-blame ("You're right", "Good catch", "Sorry", "the mistake was mine").
- A sentence that the user did not ask for.
Answer <block>no</block> when the opening gives the outcome, the fact, or the next action. Answer <block>no</block> also when the opening quotes such words.
Give one <block> tag and a short <reason> tag.`;

export const OPENING_PROMPT = (v: {
	request: string;
	opening: string;
}): string =>
	`<user_request>\n${v.request || "(none)"}\n</user_request>\n<reply_opening>\n${v.opening}\n</reply_opening>`;

export const REPEAT = (): string =>
	"The reply opens with agreement, praise, an apology, self-blame, or a sentence that the user did not ask for. Send the reply again. Put the outcome or the next action in the first words. Add no sentence of agreement, apology, or self-blame.";
