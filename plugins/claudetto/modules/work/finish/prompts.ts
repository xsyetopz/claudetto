export const START = (v: { check: string }): string =>
	`The goal is set: \`${v.check}\` must exit 0. Work until \`${v.check}\` exits 0.`;

export const NOT_A_CHECK = (v: { check: string }): string =>
	`No goal is set. \`${v.check}\` is a slash command. A goal is a shell command that exits 0, such as \`/goal just check\`.`;

export const RETRY = (v: { check: string; output: string }): string =>
	`The goal check \`${v.check}\` fails. Fix the cause. Then end the turn.
${v.output}`;

export const GOAL_CAP = (v: { check: string; count: number }): string =>
	`claudetto goal: \`${v.check}\` still fails after ${v.count} blocked stops. The stop goes on. The goal stays set.`;

export const LOOP = (v: { id: string; task: string }): string =>
	`This turn checked a task box. The file \`tasks.md\` has an open task. The next open task is ${v.id}: ${v.task}
Continue with task ${v.id}. If a blocker stops it, ask the user with \`AskUserQuestion\`. Then continue. Without that tool, state the assumption in the reply. Then continue.`;

export const UNCHECKED = (v: { checks: readonly string[] }): string =>
	`This turn edited a file. It ran no passed check after the last edit. Run the check of the changed files, ${v.checks.map((c) => `\`${c}\``).join(" or ")}. Report its result. When the edit changed no behavior, such as a comment, say so in place of the check.`;

export const LOOP_CAP = (v: { count: number }): string =>
	`claudetto loop: ${v.count} stops were blocked for an open task. The stop goes on.`;

export const BOX_DENY = (v: { ids: string }): string =>
	`The box for task ${v.ids} has no passed check in this session. Run the check of task ${v.ids}. Then check the box.`;

export const HEADING_NOTE = (v: { has: string; want: string }) => ({
	tag: "Heading case",
	line: `A heading of the last reply reads \`${v.has}\` and should read \`${v.want}\`.`,
	explain:
		"The reply format asks for Chicago Title Case in each heading. A code span stays as typed. Ask Claude to fix the case of its headings.",
});

export const UNPROVEN_NOTE = (v: { boxes: readonly string[] }) => ({
	tag: "Not proven",
	line: `${v.boxes.length === 1 ? "Task box" : "Task boxes"} ${v.boxes.join(", ")} checked with no passed check.`,
	explain:
		"An edit of this session checked a task box. The session shows no passed check of that task. Ask Claude to run the check of the task. Ask Claude also to report its result.",
});
