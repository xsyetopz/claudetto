export const START = (v: { check: string }): string =>
  `The goal is set: \`${v.check}\` must exit 0. Work until it does.`;

export const NOT_A_CHECK = (v: { check: string }): string =>
  `No goal is set. \`${v.check}\` is a slash command, and a goal is a shell command that exits 0, such as \`/goal just check\`.`;

export const RETRY = (v: { check: string; output: string }): string =>
  `The goal check \`${v.check}\` fails. Fix the cause, and then end the turn.
${v.output}`;

export const GOAL_CAP = (v: { check: string; count: number }): string =>
  `claudetto goal: \`${v.check}\` still fails after ${v.count} blocked stops, so the stop goes on. The goal stays set.`;

export const LOOP = (v: { id: string; task: string }): string =>
  `This turn checked a task box, and the file \`tasks.md\` has an open task. The next open task is ${v.id}: ${v.task}
Go on with task ${v.id}. If a blocker stops it, ask the user with \`AskUserQuestion\`, and then go on. Without that tool, state the assumption in the reply, and go on.`;

export const UNCHECKED = (v: { checks: readonly string[] }): string =>
  `This turn edited a file and ran no passed check after the last edit. Run the check of the changed files, ${v.checks.map((c) => `\`${c}\``).join(" or ")}, and report its result. When the edit changed no behavior, such as a comment, say so in place of the check.`;

export const LOOP_CAP = (v: { count: number }): string =>
  `claudetto loop: ${v.count} stops were blocked for an open task, so the stop goes on.`;

export const BOX_DENY = (v: { ids: string }): string =>
  `The box for task ${v.ids} has no passed check in this session. Run the check of task ${v.ids}, then check the box.`;

export const DEFERRED_NOTE = (v: { item: string }) => ({
  tag: "Deferred",
  line: v.item,
  explain: `The last reply lists work as not done, and names no block that stopped it. Ask Claude to do that work now, or to name the block and the exact command for you.`,
});

export const HEADING_NOTE = (v: { has: string; want: string }) => ({
  tag: "Heading case",
  line: `A heading of the last reply should read \`${v.want}\`, not \`${v.has}\`.`,
  explain: `The reply format asks for Chicago Title Case in each heading, and a code span stays as typed. Ask Claude to fix the case of its headings.`,
});

export const UNPROVEN_NOTE = (v: { what: string }) => ({
  tag: "Not proven",
  line: `The reply says done, but ${v.what}`,
  explain: `The last reply says that the work is ready or done. A change of this session is not committed, or a checked task box has no passed check. Ask Claude to run the check and to commit, or to say what is left.`,
});
