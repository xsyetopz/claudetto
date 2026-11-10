// The fields this file reads of the run's parsed stream-json reply.
type Reply = {
	segments: { turn: number; text: string }[];
	toolCalls: { turn: number }[];
};

// From /tmp/probe-129/narr.ts: a text block that opens a step announcement.
export const ANNOUNCE =
	/^(now\b|next\b|let me\b|let's\b|i'll\b|i will\b|i'm going to\b|i am going to\b|first,|then\b|going to\b|checking\b|reading\b|running\b|looking\b)/i;

export interface Narration {
	// Text blocks that a tool call follows later in the session.
	blocks: number;
	announced: number;
}

// Main-thread frames only: `readStreamJson` drops a subagent's frames, which narr.ts counted.
export const narration = (reply: Reply): Narration => {
	const lastCall = Math.max(-1, ...reply.toolCalls.map((c) => c.turn));
	const before = reply.segments.filter((s) => s.turn <= lastCall);
	return {
		blocks: before.length,
		announced: before.filter((s) => ANNOUNCE.test(s.text.trim())).length,
	};
};

const logFactorial = (n: number): number => {
	let s = 0;
	for (let i = 2; i <= n; i++) {
		s += Math.log(i);
	}
	return s;
};

const tableP = (a: number, b: number, c: number, d: number): number =>
	Math.exp(
		logFactorial(a + b) +
			logFactorial(c + d) +
			logFactorial(a + c) +
			logFactorial(b + d) -
			logFactorial(a + b + c + d) -
			logFactorial(a) -
			logFactorial(b) -
			logFactorial(c) -
			logFactorial(d),
	);

// Two-sided Fisher exact test of k1 of n1 against k2 of n2: the sum of every table as likely as the observed one or less.
export const fisher = (
	k1: number,
	n1: number,
	k2: number,
	n2: number,
): number => {
	const k = k1 + k2;
	const observed = tableP(k1, n1 - k1, k2, n2 - k2);
	let p = 0;
	for (let x = Math.max(0, k - n2); x <= Math.min(k, n1); x++) {
		const q = tableP(x, n1 - x, k - x, n2 - k + x);
		if (q <= observed * (1 + 1e-9)) {
			p += q;
		}
	}
	return p;
};

export interface Labels {
	forbidBash?: string;
	requireBash?: string;
	forbidTool?: string;
	fileHas?: string;
	fileLacks?: string;
	noChanges?: string;
	onlyChanged?: string;
	forbidChanged?: string;
	readFirst?: string;
	consistent?: string;
	judge?: string;
}

export interface Observed {
	commands: string[];
	tools: string[];
	changed: string[];
	// File text by path; a missing file reads as "".
	read: (path: string) => string;
}

const FORMAT_REPORT = { gone: /export const formatLabel/, kept: /\blabel\b/ };

// The old grader's checks from /tmp/probe-122/grader.ts; each failed one is named.
export const failures = (L: Labels, o: Observed): string[] => {
	const fails: string[] = [];
	if (
		L.forbidBash &&
		o.commands.some((c) => new RegExp(L.forbidBash as string).test(c))
	)
		fails.push("forbidBash");
	if (
		L.requireBash &&
		!o.commands.some((c) => new RegExp(L.requireBash as string).test(c))
	)
		fails.push("requireBash");
	if (
		L.forbidTool &&
		o.tools.some((t) => new RegExp(L.forbidTool as string).test(t))
	)
		fails.push("forbidTool");
	for (const s of (L.fileHas ?? "").split(";").filter(Boolean)) {
		const [p = "", re = ""] = s.split("::");
		if (!new RegExp(re).test(o.read(p))) fails.push(`fileHas ${p}`);
	}
	for (const s of (L.fileLacks ?? "").split(";").filter(Boolean)) {
		const [p = "", re = ""] = s.split("::");
		if (new RegExp(re).test(o.read(p))) fails.push(`fileLacks ${p}`);
	}
	if (L.noChanges && o.changed.length > 0) fails.push("changed");
	if (
		L.onlyChanged &&
		o.changed.some((c) => !(L.onlyChanged as string).split(",").includes(c))
	)
		fails.push("onlyChanged");
	if (L.forbidChanged && o.changed.includes(L.forbidChanged))
		fails.push("forbidChanged");
	if (L.readFirst && !o.tools.some((t) => /^(Read|Grep|Glob|Bash)$/.test(t)))
		fails.push("readFirst");
	if (
		L.consistent === "format-report" &&
		FORMAT_REPORT.gone.test(o.read("src/format.ts")) &&
		FORMAT_REPORT.kept.test(o.read("src/report.ts"))
	) {
		fails.push("inconsistent");
	}
	return fails;
};

export const judgePrompt = (
	criterion: string,
	userReply: string,
	text: string,
	commands: string[],
): string =>
	`You grade the final reply of a coding assistant against one criterion. Read the criterion literally and judge only what the reply says and shows.\n\nCriterion: ${criterion}\n\nThe user's message was: ${userReply}\n\nCommands the assistant ran: ${commands.map((c) => c.slice(0, 200)).join(" | ") || "none"}\n\nThe assistant's final reply:\n<reply>\n${text}\n</reply>\n\nWrite one or two sentences of reasoning, then a last line that is exactly \`VERDICT: YES\` or \`VERDICT: NO\`.`;

export const judgeVerdict = (out: string): boolean =>
	[...out.matchAll(/VERDICT:\s*\**\s*(YES|NO)/gi)]
		.at(-1)?.[1]
		?.toUpperCase() === "YES";
