/**
 * The AskUserQuestion paragraph that lived in the output style. Tool use
 * belongs in the tool description (REQ-TOOLS-031). The text starts with a
 * blank line so it follows the short AskUserQuestion text.
 */
export const QUESTION_RULE =
	"\n\n" +
	"When a choice belongs to the user (a preference, or a trade-off between options they named), ask it with one `AskUserQuestion` call that lists the options, and wait for the answer, because the question dialog records the choice and a question in reply text is easy to miss.";
