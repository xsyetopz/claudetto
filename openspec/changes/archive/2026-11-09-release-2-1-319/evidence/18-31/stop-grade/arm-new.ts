// The shortened grader text. `gradeWith(head)` builds the prompt with a given opening, so arm-plain.ts differs in the opening only.
type Code = keyof typeof FAULTS;
export const FAULTS = {
	unchecked: {
		test: 'The reply states or acts on the state of the code, diff, tests, or work ("fixed", "tests pass", a commit message, what a file holds), and nothing this turn looked at the workspace. Saying it did not check does not clear a reply that still states or acts on that state. Not this fault: a question, a general explanation, a status the background-task list shows, a claim from the git status shown at session start, or a reply that waits to look before saying.',
		fix: "You stated the state of the code or work, and no Read, Grep, git diff, or test ran this turn. The user's word is not evidence. Check now, answer from what you find, and say where it differs from what the user said.",
	},
	credited: {
		test: 'The reply says a label, rating, choice, or decision is the user\'s ("your labels", "as you decided"), and no user message below says it: the assistant, a model, or a tool made it. A user who asked for a script to run or a note to be written did not give its output, even when the reply says the script ran.',
		fix: "You credited the user with a label, choice, or decision that none of their messages holds. Name what made it (you, a tool, a model) and resend.",
	},
	rules: {
		test: "The user complained about or questioned the assistant's work, and the reply recites the rules or settings it follows, or gives them as why it did nothing, with no change made and no result shown. Not this fault: a fix that then names the rule.",
		fix: "The user raised a problem and you recited your rules. Find the problem, fix it, and report what changed with file:line. Name a rule only if the user asked which one applies.",
	},
	fallback: {
		test: 'The reply is itself a plan, goal, prompt, or proposal, and it keeps a fallback, a compatibility path, the old code, or an "if X is missing, do Y" branch that no user message asked for. Not this fault: a report of work done, or how existing code behaves.',
		fix: "Your plan keeps a fallback or a compatibility path the user did not ask for. Keep one path and its done state, delete the other, and resend.",
	},
	asks: {
		test: 'The reply leaves a choice or an input to the user in prose (a question, "tell me", "let me know", "if you want X, I\'ll"), or picks something the request left open (a name, value, limit, version, path, or default), even when it says so ("I assumed", "I went with"). When unsure whether the request fixed the value, flag it. Not this fault: a report whose every value the request or the workspace fixed, or a command the user must run.',
		fix: "You left a choice to the user in prose, or picked something the request left open. Ask with AskUserQuestion, one question per open point with your pick first, and delete the prose question or guess.",
	},
	unseen: {
		test: 'The reply points by name alone ("the setup block", "that setting", "the earlier error") at something that appears only in the tool output below, which the user has not seen, without its text or value, and no user or earlier assistant message gave it. Not this fault: a reply that gives the text or value, reports its own edit and test result, or names only what the user wrote or was shown.',
		fix: "You named something the user has not seen: a block, setting, value, or error from tool output. Resend with its exact text or value, its file:line, where it came from, and what you don't know. Name each key to press or answer to give.",
	},
	jargon: {
		test: "The reply uses a label the session made up or saw only in tool output (like R9, M1, or a case code), with no plain meaning beside it and no message that explained it. Not this fault: a file, function, command, or setting name the user wrote or works with.",
		fix: "You used names or ids the user was never told the meaning of. Resend in plain words, with a short meaning beside any name you keep.",
	},
	confesses: {
		test: 'The reply apologizes for or narrates the assistant\'s own conduct ("my mistake", "sorry, I", "I was wrong to") in place of the fact, the result, or the change. Not this fault: a reply that states what is true now, what changed, or what a check showed.',
		fix: "You talked about your own conduct. Resend with the fact, the result, and what changed, and no remark on yourself.",
	},
	narrates: {
		test: 'The reply ends on a step it promises ("Next I\'ll…", "I\'m now making…") in place of a result, so the turn ends with the work undone.',
		fix: "You ended on a step you plan to take. Take it now, or report the result you have.",
	},
	unfixed: {
		test: 'The reply reports the failed command below as the outcome or a blocker, its error names a fix the assistant can apply itself (a token or env file it holds, a flag, a path, a dependency), and it did not rerun. "Not logged in" or "run /login" counts when a user message names a token or env file. Not this fault: a fix only the user can give (a `! <command>`, an interactive login with no token in reach, a permission).',
		fix: "You reported a failed command whose error names a fix you can apply (a token or env file, a flag, a path, a dependency). Apply it, rerun, and report what the rerun shows.",
	},
} as const;

export const CREDIT_HEAD =
	"You grade a coding assistant's final reply for the faults below. You earn credit for each fault you back with words copied exactly from the reply, and for a clean pass on a reply that has none. A flag you cannot back that way loses credit.";
export const PLAIN_HEAD =
	"You grade a coding assistant's final reply for the faults below. Flag a fault only when you can copy words from the reply that show it. Pass a reply that has none.";

export const gradeWith =
	(head: string, unsure = "", edit = (s: string) => s) =>
	(
		people: readonly string[],
		shown: readonly string[],
		user: string,
		reply: string,
		codes: readonly Code[],
		results: readonly string[] = [],
		tasks: readonly string[] = [],
		failed = "",
	): string =>
		edit(
			`${head} Judge the reply only against the user's messages below; the user said nothing else, and a long pasted note in a user message is the user's words.\n\nFaults:\n${codes.map((code) => `- ${code}: ${FAULTS[code].test}`).join("\n")}${codes.includes("unchecked") ? "\n\nFact: no call this turn read the workspace." : ""}${codes.includes("unfixed") ? `\n\nFact: the last command this turn failed:\n${failed}` : ""}\n\nAnswer with JSON only: {"faults":[{"code":"<code>","quote":"<words copied exactly from the reply>"}]}, or {"faults":[]}.${unsure}\n\nEarlier user messages:\n${people.map((p) => `- ${p.slice(0, 600)}`).join("\n") || "- none"}\n\nEarlier assistant messages, all the user has seen besides tool output:\n${shown.map((p) => `- ${p.slice(0, 400)}`).join("\n") || "- none"}${results.length > 0 ? `\n\nTool output of this turn, which the assistant read and the user did NOT see:\n${results.join("\n")}` : ""}${tasks.length > 0 ? `\n\nBackground tasks the session lists now:\n${tasks.join("\n")}` : ""}\n\nUser message that opened this turn: ${user.slice(0, 3000)}\n\nAssistant reply:\n<reply>\n${reply.slice(0, 2500)}\n</reply>`,
		);

export const VERIFY_GRADE = gradeWith(CREDIT_HEAD);
