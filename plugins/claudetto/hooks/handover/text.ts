// Pure parts of the handover: the fork prompt, the transcript extract, the
// git tail, and the renewal threshold. Kept apart so tests import them.

export const KEEP_LINE = "Keep the user's corrections, refusals, and consents word for word.";

export const FORK_PROMPT = [
	"Write a handover for a fresh session that continues this work. It replaces the whole conversation, so the next session sees nothing else.",
	"Use short plain sections, under 3,000 tokens in all:",
	"- Goal: what the user asked for, in their terms.",
	"- Done: what is finished and how it was verified (commands and results).",
	"- Next: the open steps, in order.",
	"- Files: the paths that matter and why.",
	"- Commands: the exact check commands that pass or fail now.",
	"- Constraints: every user correction, refusal, and consent, word for word.",
	"Record only the rules the user set and facts that name their source, so the next session follows standing instructions and can recheck each fact.",
	"State what is true now, so the next session starts from checked state.",
	"Write it from this conversation alone, as one reply.",
].join("\n");

export type Row = { role: "user" | "assistant"; text: string };

const ROW_LIMIT = 500;
const EXTRACT_LIMIT = 12_000;

const TITLE = "# Handover from Previous Session";
const GIT_TAIL = "\ngit HEAD: ";

/** The first `n` code units, without a surrogate pair cut in half at the end. */
const head = (text: string, n: number): string => {
	const cut = text.slice(0, n);
	return /[\uD800-\uDBFF]$/u.test(cut) && text.length > n ? cut.slice(0, -1) : cut;
};

/** The last `n` code units, without a surrogate pair cut in half at the start. */
const tail = (text: string, n: number): string => {
	if (n <= 0) return "";
	const cut = text.slice(-n);
	return /^[\uDC00-\uDFFF]/u.test(cut) && text.length > n ? cut.slice(1) : cut;
};

/** A prior handover's body, without its title and its git state, which go stale. */
const unwrap = (text: string): string => {
	const end = text.lastIndexOf(GIT_TAIL);
	return text.slice(TITLE.length, end === -1 ? undefined : end).trim();
};

/**
 * The user's prompts and the last answer, cut short: the zero-cost fallback.
 * A prior handover in the rows is carried whole and first, because it holds
 * the requirements of every earlier compaction; nesting it as one more prompt
 * row cut it to ROW_LIMIT and pushed those requirements out within a few
 * compactions.
 */
export function extract(rows: readonly Row[]): string {
	const said = rows.filter((r) => r.role === "user" && r.text.trim() !== "");
	const carried = head(
		said
			.filter((r) => r.text.trimStart().startsWith(TITLE))
			.map((r) => unwrap(r.text.trimStart()))
			.join("\n\n"),
		EXTRACT_LIMIT / 2,
	);
	const prompts = said.filter((r) => !r.text.trimStart().startsWith(TITLE)).map((r) => `- ${head(r.text.trim(), ROW_LIMIT)}`);
	const answer = rows.findLast((r) => r.role === "assistant" && r.text.trim() !== "");
	const parts = prompts.length > 0 ? ["User prompts so far:", ...prompts] : [];
	if (answer) parts.push("", "Last answer:", head(answer.text.trim(), ROW_LIMIT * 2));
	const recent = tail(parts.join("\n"), EXTRACT_LIMIT - carried.length);
	return [carried, recent].filter((s) => s.trim() !== "").join("\n\n");
}

/** The handover body followed by the git state read at that moment. */
export function compose(body: string, head: string, status: string): string {
	const git = [`git HEAD: ${head || "unknown"}`, "git status --short:", status || "(clean)"];
	return [TITLE, "", body.trim(), "", ...git].join("\n");
}

/** Reads "70000", "70k" or "1.5M"; undefined for anything else. */
export function parseTokens(value: string | undefined): number | undefined {
	const m = /^\s*(\d+(?:\.\d+)?)\s*([kKmM]?)\s*$/u.exec(value ?? "");
	if (!m) return undefined;
	const scale = { "": 1, k: 1e3, m: 1e6 }[(m[2] ?? "").toLowerCase() as "" | "k" | "m"];
	return Math.round(Number(m[1]) * scale);
}

export const DEFAULT_THRESHOLD = 70_000;

/** The renewal threshold in tokens: a percent of the window wins over a token count. */
export function threshold(window: number, pct: string | undefined, tokens: string | undefined): number {
	const p = Number(pct);
	if (pct && Number.isFinite(p) && p > 0 && p <= 100) return Math.round((window * p) / 100);
	return parseTokens(tokens) ?? DEFAULT_THRESHOLD;
}

/** True for a Bash command that makes a commit. */
export function isCommit(command: string): boolean {
	return /(^|[;&|]\s*|\s)git\s+((-[Cc]\s+\S+|-\S+)\s+)*commit\b/u.test(command);
}
