export const START = (v: { check: string }): string =>
  `The goal is set: \`${v.check}\` must exit 0. Work until it does.`;

export const RETRY = (v: { check: string; output: string }): string =>
  `The goal check \`${v.check}\` fails. Fix the cause, and then end the turn.
${v.output}`;
