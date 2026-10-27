// The words of the user in a session: the typed messages, the earlier handoff, and the rules that the user gave.

import type { SessionMessage } from "claude-code";
import { isRecord } from "../../jev/domain/jev.ts";
import { clip, spread } from "./compact.ts";
import { CONSTRAINT_CHARS_MAX, RULES_TOKENS } from "./limits.ts";

const HANDOFF_AT = /^# Handoff$/m;
const NOTES = /<(system-reminder|task-notification)>[\s\S]*?<\/\1>/g;
// The text that Claude Code puts in a user row: the tags of a command, a hook text, a skill body, a caveat, an interrupt mark, and the summary of a compaction (2.1.311, `yKe`).
const TAGGED =
	/^(?:<(?:local-command-[\w-]+|command-(?:name|message|args)|user-prompt-submit-hook|command-std\w+|bash-\w+)\b|Caveat: |Base directory for this skill|Stop hook feedback|\[Request interrupted by user|This session is being continued from a previous conversation that ran out of context\.)/;
const COMMAND_NAME = /<command-name>([^<]*)<\/command-name>/;
const COMMAND_ARGS = /<command-args>([^<]*)<\/command-args>/;
const SENTENCE_BREAK = /(?<=[.!?])\s+/;
const SECTION_BREAK = /^(?=## )/m;
export const RULE =
	/\b(?:do not|don['’]t|never|must not|pin|pinned|no more)\b|^(?:please\s+)?(?:only|keep|always)\b/i;

/** True when `text` holds a handoff, as the resume prompt of a handover does. */
const isHandoff = (text: string): boolean => HANDOFF_AT.test(text);

/** The words that the user typed in a user row, or `""`: a slash command is `/name args`, and a note, a reminder, a hook text, and a handoff are no words of the user. */
export const typedOf = (m: SessionMessage): string => {
	if (m.role !== "user" || isHandoff(m.text)) {
		return "";
	}
	const name = COMMAND_NAME.exec(m.text)?.[1];
	const args = COMMAND_ARGS.exec(m.text)?.[1]?.trim();
	if (name !== undefined) {
		return args ? `${name} ${args}` : "";
	}
	const plain = m.text.replace(NOTES, "").trim();
	return TAGGED.test(plain) ? "" : plain;
};

export const sentencesOf = (text: string): string[] =>
	text
		.split("\n")
		.flatMap((line) => line.split(SENTENCE_BREAK))
		.map((s) => s.trim())
		.filter(Boolean);

/** Each value once at its last place, so a value typed again counts as new. */
export const newestOnce = (values: readonly string[]): string[] =>
	values.filter((v, i) => values.lastIndexOf(v) === i);

/** The sections of the last handoff of `messages`, as the non-empty lines of each body by heading, or an empty map. */
export const earlierOf = (
	messages: readonly SessionMessage[],
): Map<string, string[]> => {
	const text = messages.findLast((m) => isHandoff(m.text))?.text ?? "";
	const from = text.search(HANDOFF_AT);
	const found = new Map<string, string[]>();
	if (from < 0) {
		return found;
	}
	for (const part of text.slice(from).split(SECTION_BREAK)) {
		const [heading = "", ...lines] = part.split("\n");
		found.set(
			heading,
			lines.filter((line) => line.trim() !== ""),
		);
	}
	return found;
};

const VALUES_LINE = /^Values of the user: (.*)\.$/;

/** The values in backticks of the `Values of the user` line of an earlier handoff, or none. */
export const valuesBefore = (lines: readonly string[]): string[] =>
	lines.flatMap((line) =>
		[...(VALUES_LINE.exec(line)?.[1] ?? "").matchAll(/`([^`\n]+)`/g)].map(
			([, value = ""]) => value,
		),
	);

const QUOTED = /^- "(.*)" \(([^()]*)\)$/;
const CLAUDE_MD = /(?:^|\/)CLAUDE\.md$/;

/** The text that the tool calls of `m` wrote into a `CLAUDE.md` file. */
const claudeMdOf = (m: SessionMessage): string[] =>
	m.toolUses.flatMap((use) => {
		const input = isRecord(use.input) ? use.input : {};
		const path = input["file_path"];
		return typeof path === "string" && CLAUDE_MD.test(path)
			? [input["new_string"], input["content"]].filter(
					(v): v is string => typeof v === "string",
				)
			: [];
	});

const USER_LABEL = /^user message (\d+)$/;

/** The rules, each word for word with its source, up to `RULES_TOKENS`. The order is the rules of an earlier handoff, then the rules of `CLAUDE.md` edits, then the typed rules, oldest first. Over the budget, `spread` keeps the first and the newest rules and drops the middle. A rule that is there is not added twice. The count of the labels `user message N` goes on from the earlier handoff. */
export const rulesOf = (
	messages: readonly SessionMessage[],
	earlier: string[],
) => {
	const found = new Map<string, string>();
	let n = 0;
	for (const line of earlier) {
		const m = QUOTED.exec(line);
		if (!m) {
			continue;
		}
		found.set(m[1] ?? "", m[2] ?? "");
		n = Math.max(n, Number(USER_LABEL.exec(m[2] ?? "")?.[1] ?? 0));
	}
	const add = (text: string, source: string) => {
		for (const s of sentencesOf(text).filter((t) => RULE.test(t))) {
			const rule = clip(s, CONSTRAINT_CHARS_MAX);
			if (!found.has(rule)) {
				found.set(rule, source);
			}
		}
	};
	for (const m of messages) {
		for (const text of claudeMdOf(m)) {
			add(text, "`CLAUDE.md` edit");
		}
	}
	for (const m of messages) {
		const typed = typedOf(m);
		if (typed !== "") {
			add(typed, `user message ${++n}`);
		}
	}
	return spread(
		[...found],
		RULES_TOKENS,
		([rule, source]) => `- "${rule}" (${source})`,
	);
};
