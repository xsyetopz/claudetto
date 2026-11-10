import type { On } from "claude-code";

import { REPLY_COMMAND } from "./texts.ts";

const LABEL = 60;

const quote = (text: string): string =>
	`Re:\n${text
		.trim()
		.split("\n")
		.map((line) => `> ${line}`.trimEnd())
		.join("\n")}\n\n`;

const quoteRequest = (text: string) => ({
	text: quote(text),
	mode: "append" as const,
});

/** The paragraphs of a reply, split on blank lines. */
const partsOf = (reply: string): string[] =>
	reply
		.split(/\n\s*\n/u)
		.map((p) => p.trim())
		.filter((p) => p !== "");

const outline = (parts: string[]): string =>
	parts
		.map((p, i) => {
			const first = p.split("\n")[0] ?? "";
			return `${i + 1}. ${first.length > LABEL ? `${first.slice(0, LABEL)}...` : first}`;
		})
		.join("\n");

/**
 * `/reply` puts a quoted "Re:" block in the prompt box. The mouse selection is the part when there is one; else `/reply N` names the Nth paragraph of the last reply, and bare `/reply` lists them.
 * The engine lets a plugin bind no chord (a Button's `action` names an engine action), so a command is the trigger.
 */
export const reply = (on: On): void => {
	on("command.run", { command: REPLY_COMMAND }, async ($, e) => {
		const awaited = await $.ui.selection();
		let part = (awaited?.text ?? "").trim();
		if (part === "") {
			const awaited2 = await $.session.messages();
			const last = awaited2.findLast(
				(m) => m.role === "assistant" && m.text.trim() !== "",
			);
			if (last === undefined) {
				return { text: "There is no reply to answer yet." };
			}
			const parts = partsOf(last.text);
			const n = Math.trunc(Number(e.args));
			if (!(n >= 1 && n <= parts.length)) {
				return {
					text: `Select text with the mouse and run /${REPLY_COMMAND}, or pick a paragraph with /${REPLY_COMMAND} N:\n${outline(parts)}`,
				};
			}
			part = parts[n - 1] ?? "";
		}
		const { isFilled } = await $.prompt.fill(quoteRequest(part));
		return {
			text: isFilled
				? "Quoted into the prompt. Type your answer below it."
				: "The prompt box could not take the quote.",
		};
	});
};
