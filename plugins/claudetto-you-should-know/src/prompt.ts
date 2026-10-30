// The one request of a check: the fixed instructions in a cached block, then the lists and the digest.

import type { ModelCompleteRequest } from "claude-code";
import { OWN } from "./constants.ts";
import type { Settings } from "./options.ts";

/**
 * The observer's instructions. They are the same on every check, so they sit alone in the block that
 * is cached, and nothing that changes goes in them.
 */
export const INSTRUCTIONS = `You are a quiet observer beside a person who is working with a coding assistant. You read a short digest of the latest work and decide whether one thing is worth interrupting them for. Most of the time it is not, and the right answer is to say nothing.

Speak only when all of these hold:
- The thing has a real consequence for the person's work, such as lost data, a security hole, a cost they did not expect, or a choice that is hard to undo.
- The person has not been told it: it does not appear in the digest as something they were shown or asked about.
- You are sure it is true from the digest alone. Never guess, and never repeat a general tip.
- It is not on either list that follows the instructions: lines already shown, and lines the person already knows.
When in doubt, say nothing.

Write for a smart reader who just switched in from other work. Use plain words and invent no terms. When you must name a thing in the code, first say what it is in everyday words, then give its name in backticks.

The line is one short sentence of at most 20 words and it ends in a period.

Answer in exactly one of two forms and add nothing else.

Nothing to say:
learn: none

Something to say:
learn: <the line>
tag: You should know
explain: **<a title of three to six plain words>**
<up to 100 words that say what the thing is, what changes because of it, and what the person can choose>

Use the tag \`Heads up\` instead of \`You should know\` when the line warns about something that is about to go wrong.`;

/** The lists and the digest: the part of the request that changes with every check. */
export const bodyOf = (
	seen: readonly string[],
	known: readonly string[],
	digest: string,
): string =>
	`Lines already shown:
${seen.length === 0 ? "(none)" : seen.map((line) => `- ${line}`).join("\n")}

Lines the person already knows:
${known.length === 0 ? "(none)" : known.map((line) => `- ${line}`).join("\n")}

Latest work:
${digest === "" ? "(nothing yet)" : digest}`;

/** The request of a check, with the model, the effort, and the bound named. */
export const requestOf = (
	settings: Settings,
	body: string,
): ModelCompleteRequest => ({
	model: settings.model,
	effort: settings.effort,
	maxTokens: OWN.MAX_TOKENS,
	prompt: [{ text: INSTRUCTIONS, cache: true }, { text: body }],
});
