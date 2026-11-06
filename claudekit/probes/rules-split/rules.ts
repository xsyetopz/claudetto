import { join } from "node:path";
import type { Fixture, Message } from "../../src/fixture/fixture.ts";
import { clip } from "../judge/judge.ts";

export const BASELINE_DIR = "/tmp/claudetto-baseline/plugins/claudetto/rules";
export const SPLIT_DIR = join(import.meta.dir, "../../../plugins/claudetto/rules");
// The one project file that every replay @-mentions: the CLI attaches it as a Read, which loads a `paths: "**/*"` rule
// before request 1 without a model turn (probe /tmp/probe-rules2/run.ts, claude 2.1.318).
export const CONTEXT_FILE = "README.md";
export const CONTEXT_TEXT = "# project\n";

export interface RuleFile {
	name: string;
	text: string;
}

// Read at run time, so a rename of the files changes nothing here.
export const readRules = async (dir: string): Promise<RuleFile[]> =>
	Promise.all(
		[...new Bun.Glob("**/*.md").scanSync(dir)].sort().map(async (name) => ({ name, text: await Bun.file(join(dir, name)).text() })),
	);

export const ruleBody = (text: string): string => text.replace(/^---\n[\s\S]*?\n---\n/, "").trim();

// The rule text as it sits inside a JSON request body.
export const inJson = (text: string): string => JSON.stringify(text).slice(1, -1);

// Texts a request must hold, and texts of the other arm that it must not hold.
export const ruleEvidence = (own: RuleFile[], other: RuleFile[]): { want: string[]; forbid: string[] } => {
	const want = own.map((r) => inJson(ruleBody(r.text)));
	return { want, forbid: other.map((r) => inJson(ruleBody(r.text))).filter((t) => !want.some((w) => w.includes(t))) };
};

export const ruleDiff = (requests: unknown[], ev: { want: string[]; forbid: string[] }): string[] => {
	const all = requests.map((r) => JSON.stringify(r)).join("\n");
	return [
		...ev.want.filter((t) => !all.includes(t)).map((t) => `rule text missing from the requests: ${t.slice(0, 60)}`),
		...ev.forbid.filter((t) => all.includes(t)).map((t) => `other arm's rule text present: ${t.slice(0, 60)}`),
	];
};

// The last user turn is the prompt; the turns before it are the seeded prefix.
export const replayCase = (f: Fixture): { name: string; prompt: string; prefix: Message[] } => ({
	name: f.id,
	prompt: `${f.prefix.at(-1)?.content ?? ""}\n\n@${CONTEXT_FILE}`,
	prefix: f.prefix.slice(0, -1),
});

const CHARS_PER_TOKEN = 3.6;
// Measured on the fake: tools off sends about 4,000 tokens of system and reminders before the prefix.
export const OVERHEAD_TOKENS = 4_000;
const toks = (chars: number): number => Math.ceil(chars / CHARS_PER_TOKEN);

export const replayTokens = (f: Fixture): number =>
	OVERHEAD_TOKENS + toks(f.prefix.reduce((n, m) => n + m.content.length, 0)) + 2_000;

// Judge input: ask, three replies, the next message; each field clipped like probes/judge.
const CANARY_CHARS = 2_000;
const FIELD = 20_000;
export const judgeTokens = (f: Fixture): number =>
	2_000 + toks(Math.min(FIELD, f.prefix.at(-1)?.content.length ?? 0) + 2 * Math.min(FIELD, f.reply.length) + CANARY_CHARS + Math.min(FIELD, f.userReply.length)) + 2 * 200;

export const fixtureTokens = (f: Fixture): number => 2 * replayTokens(f) + judgeTokens(f);

const hash = (s: string): string => new Bun.CryptoHasher("sha256").update(s).digest("hex");

// Deterministic order, so the first k are an unbiased sample.
export const pick = (fixtures: Fixture[], k: number): Fixture[] =>
	fixtures.map((f) => ({ f, h: hash(f.id) })).sort((a, b) => (a.h < b.h ? -1 : 1)).slice(0, k).map((x) => x.f);

// Largest k whose estimate fits the budget.
export const fit = (fixtures: Fixture[], budget: number): number => {
	let sum = 0;
	let k = 0;
	for (const f of pick(fixtures, fixtures.length)) {
		sum += fixtureTokens(f);
		if (sum > budget) {
			break;
		}
		k++;
	}
	return k;
};

export type Slot = "baseline" | "split" | "canary";
export const SLOTS = ["A", "B", "C"] as const;

// A fixed shuffle per case id, so a rerun shows the same order and the arm never decides the position.
export const orderFor = (id: string): Slot[] => {
	const h = hash(`order:${id}`);
	const all: Slot[] = ["baseline", "split", "canary"];
	return all.map((s, i) => ({ s, k: h.slice(i * 8, i * 8 + 8) })).sort((a, b) => (a.k < b.k ? -1 : 1)).map((x) => x.s);
};

// A reply of another case: on the wrong subject, so no honest reply to this case looks like it.
export const canaryFor = (f: Fixture, all: Fixture[]): string => {
	const others = all.filter((o) => o.id !== f.id).sort((a, b) => (hash(f.id + a.id) < hash(f.id + b.id) ? -1 : 1));
	return clip(others[0]?.reply ?? "Done.", "head").slice(0, CANARY_CHARS);
};

export const JUDGE_SYSTEM = `<task>
You read a user's ask to a coding agent, three candidate replies A, B and C, and the user's actual next message.
The next message shows what the user wanted or what went wrong. Grade each reply on substance against that next message:
did it do the work the user wanted, say what was true, and leave nothing the next message objects to or has to redo.
Ignore style, length, and wording; do not guess which reply comes from which source.
</task>
<labels>
good: the next message gives no sign that this reply missed, broke, or overdid anything.
partial: the reply did part of what the next message shows was wanted, or the next message objects to a part of it.
bad: the reply is on another subject, or the next message objects to its core.
</labels>
<answer_format>
Write four lines and nothing else. The first line is one sentence on what the next message shows the user wanted.
Then one line each for A, B and C, in the form "A: good", "B: partial", "C: bad".
</answer_format>`;

export const judgePrompt = (f: Fixture, replies: Record<Slot, string>): string => {
	const order = orderFor(f.id);
	const blocks = order.map((slot, i) => `<reply id="${SLOTS[i]}">\n${clip(replies[slot], "tail")}\n</reply>`);
	return `<ask>\n${clip(f.prefix.at(-1)?.content ?? "", "tail")}\n</ask>\n${blocks.join("\n")}\n<next_message>\n${clip(f.userReply, "head")}\n</next_message>`;
};

export type Grade = "good" | "partial" | "bad";
const RANK: Record<Grade, number> = { bad: 0, partial: 1, good: 2 };

export const parseGrades = (answer: string, id: string): Record<Slot, Grade> | undefined => {
	const order = orderFor(id);
	const out: Partial<Record<Slot, Grade>> = {};
	for (const [i, letter] of SLOTS.entries()) {
		const m = new RegExp(`^${letter}: (good|partial|bad)$`, "m").exec(answer);
		if (!m) {
			return undefined;
		}
		out[order[i] as Slot] = m[1] as Grade;
	}
	return out as Record<Slot, Grade>;
};

export type Outcome = "better" | "same" | "worse" | "invalid";

// The canary must not pass; a judge that rates it good is unreadable for the case.
export const outcome = (g: Record<Slot, Grade> | undefined): Outcome => {
	if (!g || g.canary === "good") {
		return "invalid";
	}
	const d = RANK[g.split] - RANK[g.baseline];
	return d > 0 ? "better" : d < 0 ? "worse" : "same";
};

// One-sided exact sign test over the non-ties: the chance of this many "worse" or more if split were no worse.
export const pWorse = (better: number, worse: number): number => {
	const n = better + worse;
	let p = 0;
	let c = 1;
	for (let k = 0; k <= n; k++) {
		if (k > 0) {
			c = (c * (n - k + 1)) / k;
		}
		if (k >= worse) {
			p += c;
		}
	}
	return p / 2 ** n;
};

export const tally = (outcomes: Outcome[]): Record<Outcome, number> & { pWorse: number; verdict: string } => {
	const t = { better: 0, same: 0, worse: 0, invalid: 0 };
	for (const o of outcomes) {
		t[o]++;
	}
	const p = pWorse(t.better, t.worse);
	return { ...t, pWorse: p, verdict: p > 0.05 ? "split matches or beats baseline (worse is not significant)" : "split is worse than baseline" };
};
