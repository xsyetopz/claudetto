export const GUIDE_CUT = (v: {
  max: string;
  command: string;
}): string => `The guide stops at ${v.max} characters.
Run \`${v.command}\` to read the rest when the task needs it.`;

export const NO_GUIDE = (v: {
  command: string;
  why: string;
}): string => `\`${v.command}\` gave no guide (${v.why}).
Run \`agent-browser --help\` to see the commands of the installed version.`;

export const NOT_INSTALLED = `agent-browser is not installed. Install it with \`bun add -g agent-browser\`, then run \`agent-browser install\` for its Chrome, and go on.`;
