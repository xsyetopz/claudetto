export const UNSOURCED = (v: {
  claims: string;
}): string => `This text has claims with no source:
${v.claims}
Do one of these for each claim, then write again:
1. Name the source: a user message, a tool result of this session, or a file of the project.
2. Mark the claim \`(proposed)\` or \`[NEEDS CLARIFICATION: ...]\`.
3. Ask the user.`;
