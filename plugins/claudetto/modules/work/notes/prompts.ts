// The texts of the notes that the user reads above the prompt.

export const INSERT_INTRO = "Here is a note offered by a side agent:";

export const REPEAT_NOTE = (v: {
	kind: "deny" | "ask";
	rule: string;
	count: number;
	where: string;
}) => ({
	tag: v.kind === "deny" ? "Repeated deny" : "Repeated ask",
	line: `${v.rule} stopped ${v.count} calls`,
	explain: `The rule ${v.rule} gave a ${v.kind} ${v.count} times in this session. It sits in ${v.where}. Change the rule, or ask Claude for another way.`,
});

export const CHECK_NOTE = (v: {
	command: string;
	count: number;
	sign: string;
}) => ({
	tag: "Check loop",
	line: `${v.command} failed ${v.count} times in a row${v.sign ? `: ${v.sign}` : ""}`,
	explain: `The check ${v.command} failed ${v.count} times in a row${v.sign ? ` with the same failing test: ${v.sign}` : ""}. Ask Claude to find the cause before it runs the check again.`,
});

export const BACKGROUND_NOTE = (v: { what: string; minutes: number }) => ({
	tag: "Background task",
	line: `${v.what} runs for ${v.minutes} minutes`,
	explain: `The background task ${v.what} runs for ${v.minutes} minutes. Ask Claude to read its output, or stop it if it hangs.`,
});

export const USER_EDIT_NOTE = (v: { path: string }) => ({
	tag: "Your edit",
	line: `${v.path} has a change from another author`,
	explain: `The file ${v.path} has a change that no session of Claude made, and Claude edits it next. Check that its edit keeps your change.`,
});

export const KEY_INSERT = "1: Insert in prompt";

export const KEY_OFF = "2: Turn notes off";
