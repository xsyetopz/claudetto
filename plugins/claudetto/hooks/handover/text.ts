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
	// Positive instructions with a reason, per Anthropic's prompting guide. REQ-REPLY-139: vanilla's
	// summary lists all user messages, which carries passing opinions forward as standing preferences.
	"Record only the rules the user set and facts that name their source, so the next session follows standing instructions and can recheck each fact.",
	"State what is true now, so the next session starts from checked state.",
	"Write it from this conversation alone, as one reply.",
].join("\n");

export type Row = { role: "user" | "assistant"; text: string };

const ROW_LIMIT = 500;
const EXTRACT_LIMIT = 12_000;

/** The user's prompts and the last answer, cut short: the zero-cost fallback. */
export function extract(rows: readonly Row[]): string {
	const prompts = rows
		.filter((r) => r.role === "user" && r.text.trim() !== "")
		.map((r) => `- ${r.text.trim().slice(0, ROW_LIMIT)}`);
	const answer = rows.findLast((r) => r.role === "assistant" && r.text.trim() !== "");
	const parts = ["User prompts so far:", ...prompts];
	if (answer) parts.push("", "Last answer:", answer.text.trim().slice(0, ROW_LIMIT * 2));
	return parts.join("\n").slice(-EXTRACT_LIMIT);
}

/** The handover body followed by the git state read at that moment. */
export function compose(body: string, head: string, status: string): string {
	const git = [`git HEAD: ${head || "unknown"}`, "git status --short:", status || "(clean)"];
	return [`# Handover from the previous session`, "", body.trim(), "", ...git].join("\n");
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
