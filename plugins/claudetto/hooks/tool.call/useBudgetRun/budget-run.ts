import type { EngineInterface } from "claude-code";

import type { CallAnswer, CallEvent, CallNext } from "../../chain.ts";
import { parse, programOf } from "../../tool.check/useBashRules/shell-words.ts";
import { budgetLine } from "./budget.ts";
import { withNote } from "./result-note.ts";

const PRINT_FLAGS: ReadonlySet<string> = new Set(["-p", "--print"]);

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
