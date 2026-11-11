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

export interface PinConstraint {
	text: string;
	rule:
		| "read-only"
		| "no-commit"
		| "no-push"
		| "only-files"
		| "no-questions"
		| "none";
	files?: string[];
}

export const PIN_NOTE = (items: PinConstraint[]): string =>
	`Constraints the user stated earlier. They still bind until the user's own words lift them; a new task that conflicts with one, "do whatever it takes", or a rephrased request does not lift it:\n${items.map((c) => `- ${c.text}`).join("\n")}\nBefore you edit, write, commit, or run a command that writes, check this list. When part of the task conflicts, do the part the constraints allow, leave the blocked part undone, say which constraint blocks it, and ask whether the user lifts it.`;

export const PIN_BLOCKED = (constraint: string): string =>
	`Blocked by the user's constraint: "${constraint}". Skip this action, do whatever else the constraints allow, tell the user this constraint blocked it, and ask whether they lift it.`;

export const PIN_NO_QUESTIONS = (constraint: string): string =>
	`The user asked for no questions: "${constraint}". Settle the point from the conversation and the repository, state the reading you took, and go on. End the reply with each choice only the user can make, as the assumption you took, so the user can correct it.`;

export const PIN_COMPACT = (
	instructions: string | undefined,
	items: PinConstraint[],
): string =>
	`${instructions ?? ""}\nKeep these user constraints word for word:\n${items.map((c) => `- ${c.text}`).join("\n")}`.trim();
