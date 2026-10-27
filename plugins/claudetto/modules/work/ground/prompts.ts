export const UNSOURCED = (v: {
	claims: string;
}): string => `This text has claims with no source:
${v.claims}
Do one of these for each claim. Then write the text again:
1. Name the source: a user message, a tool result of this session, or a file of the project.
   When a local command with no model call or login can show the claim, run it. Then name its result.
2. Mark the claim \`(proposed)\` or \`[NEEDS CLARIFICATION: ...]\`.
3. Ask the user.`;
