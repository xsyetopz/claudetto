import type { EngineInterface, On, SessionUsage } from "claude-code";

import type { CallAnswer, CallEvent, CallNext } from "../../chain";
import { parse, programOf } from "../../shell/shell-words";
import { isRecord } from "../../tools";

const FULL = 100;

const BAND = 10;

const USE = ". Report it after a paid run, and finish the task at any share.";

const PRINT_FLAGS: ReadonlySet<string> = new Set(["-p", "--print"]);

type Usage = Pick<SessionUsage, "context" | "rateLimits">;

type Answer = Awaited<CallAnswer>;

const used = (usage: Pick<SessionUsage, "rateLimits">, kind: string) =>
	usage.rateLimits.find((limit) => limit.kind === kind)?.percentUsed;

const bandOf = (percent: number | undefined): string =>
	percent === undefined ? "-" : String(Math.floor(percent / BAND));

export const budgetLine = (usage: Usage): string | undefined => {
	const { percent } = usage.context;
	const parts = [
		percent === undefined ? undefined : `context ${FULL - percent}% left`,
		...[
			["five-hour", "five_hour"],
			["seven-day", "seven_day"],
		].map(([name, kind]) => {
			const share = used(usage, kind ?? "");
			return share === undefined ? undefined : `${name} ${share}% used`;
		}),
	].filter((part) => part !== undefined);
	return parts.length === 0 ? undefined : `Budget: ${parts.join(", ")}${USE}`;
};

/** The line changes only when a band does, so an unchanged budget adds nothing to a prompt. */
export const budgetBand = (usage: Usage): string =>
	[
		bandOf(usage.context.percent),
		bandOf(used(usage, "five_hour")),
		bandOf(used(usage, "seven_day")),
	].join("/");

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

/** True when a command of the line runs a model call that bills the account: `claude -p`, or any program given `--paid`. */
const isPaidRun = (command: string): boolean =>
	parse(command).commands.some((c) => {
		const { name, args } = programOf(c);
		return (
			args.includes("--paid") ||
			(name === "claude" && args.some((arg) => PRINT_FLAGS.has(arg)))
		);
	});

/** Ends the result of a paid run with the Budget line, because no prompt follows it to carry the line. */
export async function budgetRunCall(
	$: EngineInterface,
	e: CallEvent,
	next: CallNext,
): Promise<Awaited<CallAnswer>> {
	const answer = await next(e);
	if (e.tool !== "Bash" || answer.deny !== undefined || !isPaidRun(e.command)) {
		return answer;
	}
	const usage = await $.session.usage().catch((error: unknown) => {
		$.ui.log(`The session usage was not read (${String(error)})`);
	});
	const line = usage === undefined ? undefined : budgetLine(usage);
	return line === undefined ? answer : withNote(answer, line);
}

/** Adds the Budget line to a prompt when a band moved since the last line; it rides the prompt, which costs a request already. */
export const budgetHooks = (on: On): void => {
	let band = "";
	on("prompt.submit", async ($, e, next) => {
		const usage = await $.session.usage().catch((error: unknown) => {
			$.ui.log(`The session usage was not read (${String(error)})`);
		});
		const line = usage === undefined ? undefined : budgetLine(usage);
		if (
			usage === undefined ||
			line === undefined ||
			budgetBand(usage) === band
		) {
			return next(e);
		}
		band = budgetBand(usage);
		return next({ ...e, context: [...(e.context ?? []), line] });
	});
};
