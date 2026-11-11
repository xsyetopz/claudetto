import type { Noul, QuestionSet, State } from "./questions.ts";

/** The faults the claim check can offer. */
export type ClaimFault =
	| "credited"
	| "fallback"
	| "deferred"
	| "unchecked"
	| "rules"
	| "unfixed"
	| "options"
	| "unseen";

const noul = (instructions: string): Noul => ({ type: "noul", instructions });

/** The claim check's starting question set: one atomic Noul per judgment of each fault. */
export const CLAIM_CHECK: QuestionSet = {
	yesMin: 0.75,
	noMax: 0.65,
	pickMin: 0.75,
	escalate: true,
	questions: {
		reply_states_workspace_state: noul(
			"Does `reply` state or act on the state of the code, a diff, tests, or the work, such as saying it is fixed, saying tests pass, writing a commit message, or saying what a file holds?",
		),
		reply_credits_user: noul(
			"Does `reply` say that a label, rating, choice, or decision is the user's own?",
		),
		user_said_it: noul(
			"Do `person_messages` or `opening_message` say that label, rating, choice, or decision themselves?",
		),
		user_raised_problem: noul(
			"Does `opening_message` complain about or question the assistant's work?",
		),
		reply_recites_rules: noul(
			"Does `reply` recite the rules or settings the assistant follows, or give them as the reason it did nothing?",
		),
		reply_shows_change: noul(
			"Does `reply` report a change it made or a result it shows?",
		),
		reply_is_plan: noul(
			"Is `reply` itself a plan, goal, prompt, or proposal, and not a report of finished work?",
		),
		plan_keeps_fallback: noul(
			"Does the plan in `reply` keep a fallback, a compatibility path, the old code, or an `if X is missing, do Y` branch?",
		),
		user_asked_fallback: noul(
			"Do `person_messages` or `opening_message` ask for that fallback, compatibility path, or old code?",
		),
		reply_points_by_name: noul(
			"Does `reply` point by name alone, such as `the setup block` or `that setting`, at something that appears only in `tool_output`, without giving its text or value?",
		),
		text_shown_to_user: noul(
			"Did `person_messages`, `shown_messages`, or `opening_message` already give the text or value that `reply` names?",
		),
		reply_reports_failure: noul(
			"Does `reply` report the command in `failed_command` as the outcome or as a blocker?",
		),
		error_names_own_fix: noul(
			"Does the error in `failed_command` name a fix the assistant can apply itself, such as a token or env file it holds, a flag, a path, or a dependency?",
		),
		fix_needs_user: noul(
			"Does that fix need the user, such as a `! <command>`, an interactive login with no token in reach, or a permission?",
		),
		partial_check: noul(
			"Does `reply` say it checked only part of a set, such as reading some files of many?",
		),
		untested_guess: noul(
			"Does `reply` name a cause it guessed and did not test?",
		),
		run_named_next: noul(
			"Does `reply` name a run the assistant could make itself as the next step?",
		),
		refusal_names_change: noul(
			"Does `reply` say a call was refused, and does the refusal name a change to the call, such as a command form, a flag, or a path?",
		),
		open_items_listed: noul(
			"Does `reply` list open items the assistant could still do, such as `remaining` or `still not done`?",
		),
		waits_unasked_approval: noul(
			"Does `reply` say an action waits for the user's approval?",
		),
		only_user_can_do: noul(
			"Is the work `reply` leaves open work only the user can do, such as a `! <command>`, a paid call that waits for approval, or an action a denial declined?",
		),
		reply_ends_with_choice: noul(
			"Does `reply` end by asking the user to choose between options, or answer yes or no, in its own text?",
		),
	},
};

type Wanted = readonly [name: string, answer: "yes" | "no"];

/** Per fault, the Nouls it asks and the answers that make it hold; an `unsettled` answer matches none, so doubt never blocks. */
const TABLE: Readonly<
	Record<
		ClaimFault,
		{
			readonly all: readonly Wanted[];
			readonly any?: readonly string[];
		}
	>
> = {
	unchecked: { all: [["reply_states_workspace_state", "yes"]] },
	credited: {
		all: [
			["reply_credits_user", "yes"],
			["user_said_it", "no"],
		],
	},
	rules: {
		all: [
			["user_raised_problem", "yes"],
			["reply_recites_rules", "yes"],
			["reply_shows_change", "no"],
		],
	},
	fallback: {
		all: [
			["reply_is_plan", "yes"],
			["plan_keeps_fallback", "yes"],
			["user_asked_fallback", "no"],
		],
	},
	unseen: {
		all: [
			["reply_points_by_name", "yes"],
			["text_shown_to_user", "no"],
		],
	},
	unfixed: {
		all: [
			["reply_reports_failure", "yes"],
			["error_names_own_fix", "yes"],
			["fix_needs_user", "no"],
		],
	},
	deferred: {
		all: [["only_user_can_do", "no"]],
		any: [
			"partial_check",
			"untested_guess",
			"run_named_next",
			"refusal_names_change",
			"open_items_listed",
			"waits_unasked_approval",
		],
	},
	options: { all: [["reply_ends_with_choice", "yes"]] },
};

/** The names of every Noul the offered faults need. */
export const noulsFor = (offered: readonly ClaimFault[]): string[] => [
	...new Set(
		offered.flatMap((fault) => [
			...TABLE[fault].all.map(([name]) => name),
			...(TABLE[fault].any ?? []),
		]),
	),
];

/** The offered faults that hold under `answers`. */
export const faultsOf = (
	offered: readonly ClaimFault[],
	answers: Readonly<Record<string, string>>,
): ClaimFault[] =>
	offered.filter((fault) => {
		const row = TABLE[fault];
		return (
			row.all.every(([name, want]) => answers[name] === want) &&
			(row.any === undefined || row.any.some((name) => answers[name] === "yes"))
		);
	});

/** What the claim check reads of a turn, the fields `claimTurn` and the Stop hook hold. */
export interface ClaimInput {
	readonly people: readonly string[];
	readonly shown: readonly string[];
	readonly user: string;
	readonly reply: string;
	readonly results: readonly string[];
	readonly tasks: readonly string[];
	readonly failed: string;
}

const lines = (items: readonly string[]): string =>
	items.map((item) => `- ${item}`).join("\n");

/** The named state of a turn; a field with no text is left out. */
export const claimState = (input: ClaimInput): State =>
	Object.fromEntries(
		Object.entries({
			person_messages: lines(input.people),
			shown_messages: lines(input.shown),
			opening_message: input.user,
			reply: input.reply,
			tool_output: input.results.join("\n"),
			background_tasks: input.tasks.join("\n"),
			failed_command: input.failed,
		}).filter(([, text]) => text !== ""),
	);
