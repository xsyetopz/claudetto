import type {
	CommandOptions,
	CommandResult,
	CommandRunner,
} from "../../../claudekit/session/command.ts";

export interface Call {
	readonly argv: readonly string[];
	readonly options: CommandOptions;
}

export const ok = (patch: Partial<CommandResult> = {}): CommandResult => ({
	code: 0,
	stdout: "",
	stderr: "",
	timedOut: false,
	...patch,
});

export const stubRunner = (
	answer: (call: Call) => CommandResult = () => ok(),
): { run: CommandRunner; calls: Call[] } => {
	const calls: Call[] = [];
	const run: CommandRunner = (argv, options) => {
		const call = { argv, options };
		calls.push(call);
		return Promise.resolve(answer(call));
	};
	return { run, calls };
};

/** Whether a call is a `claude` session, which no test may start. */
export const isSession = (call: Call): boolean => call.argv[0] === "claude";
