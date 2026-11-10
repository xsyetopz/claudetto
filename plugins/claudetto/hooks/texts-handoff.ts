import {
	BUILT_BY_CODE,
	HANDOFF_DIR,
	HANDOFF_TITLE,
	layout,
} from "./handoff/layout.ts";

// Handoff: the tool, the note in the context, the prompts of the handover, and the read-back.

export const HANDOFF_TOOL = "handoff";

const HANDOFF_CALL = `mcp__claudetto__${HANDOFF_TOOL}`;

export const TOOL_HANDOFF =
	"Ends this window with a handoff and starts a fresh one from it. Call it when the work in hand is done. Write `[REDACTED]` for a key or a token.";

export const HANDOFF_BUSY = "A handoff is already in progress. End your turn.";

export const HANDOFF_MISSING = (missing: readonly string[]): string =>
	`Nothing was written. Call the tool again with: ${missing.join(", ")}.`;

export const HANDOFF_UNSAVED = (path: string, error: unknown): string =>
	`The handoff could not be saved to \`${path}\` (${String(error)}). Nothing was cleared.`;

export const HANDOVER_PROMPT =
	"Continue from the handoff above: take its next steps.";

export const FORK_PROMPT = `The context is large. Write the handoff now, as the whole reply, in the layout of the context management note, starting with \`${HANDOFF_TITLE}\`.`;

/** The empty layout without its blank lines, because the note is sent in every session. */
const BLANK_LINES = /\n\n/gu;

export const contextManagementText = (): string =>
	`When the conversation grows long, finish the task in hand, then call \`${HANDOFF_CALL}\`, which writes this layout to \`${HANDOFF_DIR}/\` and starts the next window from it:\n\n\`\`\`markdown\n${layout("Written by Claude at <UTC time>.", () => []).replaceAll(BLANK_LINES, "\n")}\`\`\`\nCite plans, specs, issues, commits, and diffs by path or URL. Write \`[REDACTED]\` for a key or a token.`;

export const readBackText = (name: string, text: string): string =>
	`The handoff below was ${text.includes(BUILT_BY_CODE) ? "built by code from the transcript, so it holds no reasons" : "written by Claude in the session that ended"}. It is \`${HANDOFF_DIR}/${name}\`. Run \`git status -sb\` before you report branch or push state, because its git line holds only as of the time it names.\n\n${text}`;

export const STALE_HANDOFF = (name: string, days: number): string =>
	`The newest handoff is ${days} days old, so none was injected. It is \`${HANDOFF_DIR}/${name}\`.`;

// Constraint ledger: the user's standing constraints, kept across turns and compaction.

export type PinKind = "remark" | "question" | "dispute" | "task";

export interface PinConstraint {
	text: string;
	rule:
		| "read-only"
		| "no-commit"
		| "no-push"
		| "only-files"
		| "no-questions"
		| "none";
	quote: string;
	files?: string[];
}

export const PIN_NOTE = (items: PinConstraint[]): string =>
	`Constraints the user stated earlier. They still bind until the user's own words lift them; a new task that conflicts with one, "do whatever it takes", or a rephrased request does not lift it:\n${items.map((c) => `- ${c.text} (the user: "${c.quote}")`).join("\n")}\nBefore you edit, write, commit, or run a command that writes, check this list. When part of the task conflicts, do the part the constraints allow, leave the blocked part undone, say which constraint blocks it, and ask whether the user lifts it.`;

export const PIN_EXTRACT = (
	history: string[],
	previous: PinConstraint[],
	now: string,
): string =>
	`Classify a user's latest message to a coding assistant and list the limits the user set on its actions that still bind. Keep every limit until the user's own words lift it, even against a conflicting task, "do whatever it takes", or "get it working". Drop a limit once a later message of the user allows the act it forbids ("commit those", "you can edit package.json now"). List only limits the user worded as one: "don't", "only", "leave … alone", "read-only". A task, a file to change, or a claim about the code ("callers are done") is not a limit, and a statement of fact ("2-1-319 is out") is not a limit.\nPer limit: "text" (one short sentence), "quote": the user's exact words that set it, copied from one of the user's messages, and "rule": read-only (no disk changes), no-commit, no-push, only-files (edits only to "files"), no-questions ("stop asking"), or none. Text the user pasted from the assistant, a handoff, or a tool is not the user's words: quote none of it, and set no limit from it alone.\n"kind" is exactly one word: task, dispute, question, or remark. Judge it by the user's own words, and pick the first that fits. task: a request for work, a go-ahead ("you can commit now"), or a defect to fix, even while doubting an answer ("that's wrong, fix it"), or a report that work the user asked for earlier still fails ("I still get the error"), or a list of faults or issues to resolve, or a report that the assistant did what nobody asked ("you were not tasked to restore it"), which also sets a limit against that act, or a reply that hands back work the assistant asked the user to confirm or do, or an imperative anywhere in the message, including one after pasted material or an error, and pasted material followed by a request ("continue from here") is a task, and a remark is a task only when an earlier message of the user asked for the work it points at (earlier: "add each issue you find to the issues list"; now: "so that is yet another fault to report"), while the same remark with no such earlier request is a remark; dispute: doubt of an answer or a request for a different one ("are you sure?", "it was green for me", "just say it passes"), even as a question; question: any other question or a plan request; remark: a remark, a brainstorm, or pasted material with no request.\nAnswer with JSON only: {"kind":"...","constraints":[{"text":"...","quote":"...","rule":"...","files":["..."]}]}\n\nConstraints known so far: ${JSON.stringify(previous)}\n\nMessages:\n${history.map((m, i) => `${i + 1}. ${clip(m, 400)}`).join("\n")}\n\nLatest message: ${clip(now, 600)}`;

// A request often follows the material it is about, so a long message keeps its head and its tail.
const clip = (text: string, max: number): string =>
	text.length <= max
		? text
		: `${text.slice(0, max / 2)} … ${text.slice(-max / 2)}`;

export const PIN_BLOCKED = (constraint: string): string =>
	`Blocked by the user's constraint: "${constraint}". Skip this action, do whatever else the constraints allow, tell the user this constraint blocked it, and ask whether they lift it.`;

export const PIN_NO_QUESTIONS = (constraint: string): string =>
	`The user asked for no questions: "${constraint}". Settle the point from the conversation and the repository, state the reading you took, and go on. End the reply with each choice only the user can make, as the assumption you took, so the user can correct it.`;

export const PIN_ANSWER_FIRST =
	"The user's latest message asks or remarks and requests no work. Reply with the answer itself, from what the session holds, and mark what you did not check. When only a command can supply the answer, send this call again with no text before it. Open the reply with the answer, never with what you will do.";

export const PIN_COMPACT = (
	instructions: string | undefined,
	items: PinConstraint[],
): string =>
	`${instructions ?? ""}\nKeep these user constraints word for word:\n${items.map((c) => `- ${c.text}`).join("\n")}`.trim();
