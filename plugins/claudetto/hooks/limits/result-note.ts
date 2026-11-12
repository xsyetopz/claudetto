import type { CallAnswer } from "../chain.ts";
import { isRecord } from "../tools.ts";

type Answer = Awaited<CallAnswer>;

const withLine = (text: string, line: string): string => `${text}\n${line}`;

const withResult = (result: unknown, line: string): unknown => {
	if (typeof result === "string") {
		return { stdout: withLine(result, line), stderr: "", interrupted: false };
	}
	return isRecord(result) && typeof result["stdout"] === "string"
		? { ...result, stdout: withLine(result["stdout"], line) }
		: result;
};

/** The answer of a `Bash` call with `note` on a last line of its output and its text. */
export const withNote = (answer: Answer, note: string): Answer =>
	answer.deny === undefined
		? {
				...answer,
				result: withResult(answer.result, note),
				...(answer.text === undefined
					? {}
					: { text: withLine(answer.text, note) }),
			}
		: answer;
