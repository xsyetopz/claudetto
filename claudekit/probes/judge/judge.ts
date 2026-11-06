import type { Fixture } from "../../src/fixture/fixture.ts";

export const LABELS = ["complaint", "ok"] as const;
export type Label = (typeof LABELS)[number] | "unparsed";

// Three fields of at most this many characters stay near 17,000 tokens at the kit's 3.6 characters per token,
// inside the probe's 25,000-token bound with the system prompt and the two-line answer.
const FIELD_CHARS = 20_000;

export const SYSTEM = `<task>
You read one exchange between a user and a coding agent: the user's ask, the agent's reply, and the user's next message.
Decide whether the next message objects to the reply: says it was wrong, did not do what was asked, did something
nobody asked for, or broke one of the user's rules. A new instruction, a question, or thanks with no objection is ok.
</task>
<answer_format>
Write two lines and nothing else. The first line is one sentence on what the next message does: what the user
objected to, or what the user asked next. The second line is the single word complaint or the single word ok.
</answer_format>
<example_answer>
The user objected that the agent asked a question it could have answered by running the test.
complaint
</example_answer>`;

export const clip = (text: string, keep: "head" | "tail"): string => {
	if (text.length <= FIELD_CHARS) {
		return text;
	}
	const cut = `[${text.length - FIELD_CHARS} characters cut]`;
	return keep === "head" ? `${text.slice(0, FIELD_CHARS)}\n${cut}` : `${cut}\n${text.slice(-FIELD_CHARS)}`;
};

// The ask's and the reply's ends sit next to the user's message, so those keep their tails.
export const casePrompt = (f: Fixture): string =>
	`<ask>\n${clip(f.prefix.at(-1)?.content ?? "", "tail")}\n</ask>\n<reply>\n${clip(f.reply, "tail")}\n</reply>\n<next_message>\n${clip(f.userReply, "head")}\n</next_message>`;

// The label comes last, after the reading it follows from: a label written first was contradicted by its own reading
// (judge-sample.json rows 6 and 20). An answer whose last line is not exactly a label is unparsed.
export const parseAnswer = (answer: string): { label: Label; reading: string } => {
	const lines = answer.trim().split("\n");
	const last = lines.pop()?.trim() ?? "";
	const label = (LABELS as readonly string[]).includes(last) ? (last as Label) : "unparsed";
	return { label, reading: lines.join(" ").trim() };
};

// Ordered by a hash of the id, so the sample is fixed for a set and does not follow session order.
export const sample = (fixtures: Fixture[], n: number): Fixture[] => {
	const key = (f: Fixture) => new Bun.CryptoHasher("sha256").update(f.id).digest("hex");
	return fixtures
		.map((f) => ({ f, k: key(f) }))
		.sort((a, b) => (a.k < b.k ? -1 : 1))
		.slice(0, n)
		.map(({ f }) => f);
};
