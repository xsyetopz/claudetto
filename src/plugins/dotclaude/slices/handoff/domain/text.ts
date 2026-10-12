// The texts of the handoff that go to Claude and to the user.

/** The prompt that asks Claude to write the handoff file `file`. */
export const writePrompt = (file: string): string =>
  [
    `Write a handoff file to \`${file}\` with the \`Write\` tool.`,
    "The file holds four parts: the goal, the state, the next step, and the constraints of the user.",
    "Copy each constraint of the user word for word, because a summary drops constraints.",
    "Name each open file, each failing check, and each decision that is not final.",
    "Write no other file and make no other change.",
  ].join("\n");

/** The prompt that starts the new session: it names the handoff file and gives the next step of the change. */
export const resumeText = (file: string, next: string): string => {
  const lines = [
    `Read the handoff file \`${file}\` and continue the work from it.`,
    "Keep each constraint of the user in the file.",
  ];
  const step = next.trim();
  if (step) lines.push("The next step of the change:", step);
  return lines.join("\n");
};

/** The hint to the user when `mainHandover` is `manual` and a trigger fired. */
export const manualHint = (reason: string): string =>
  `${reason} Run \`/handoff\` to write a handoff file and start a clean session.`;

/** The reason text for a trigger. */
export const REASON_LANE = "A package of the change is done.";
export const reasonContext = (percent: number): string =>
  `The context is at ${Math.round(percent)} percent.`;
