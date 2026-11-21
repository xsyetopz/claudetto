import type { On } from "claude-code";
import type { Engine } from "claude-code/testing";

const FREE = {
	exitCode: 0,
	stdout: "System-wide memory free percentage: 50%\n",
	stderr: "",
	isStdoutTruncated: false,
	isStderrTruncated: false
};

/**
 * Stands in for the Bash tool beneath the plugin's own hooks.
 *
 * @param on The test's registrar.
 * @returns The commands that reached the tool, in order.
 */
export const stubBash = (on: On): string[] => {
	on("process.run", () => ({ value: FREE }));
	on("tool.check", () => ({ decision: "allow" }));
	const ran: string[] = [];
	on("tool.call", { tool: "Bash" }, (_$, e) => {
		if (e.tool === "Bash") {
			ran.push(e.command);
		}
		return { result: "ok" };
	});
	return ran;
};

/**
 * Answers `HOME` with a fixed folder.
 *
 * @param on The test's registrar.
 */
export const stubHome = (on: On): void => {
	on("env.get", (_$, e) => ({
		value: e.name === "HOME" ? "/Users/u" : undefined
	}));
};

/**
 * Runs one sandbox-off Bash call.
 *
 * @param $ The test's engine.
 * @param command The shell command.
 * @returns What the call answered, or the error it was refused with.
 */
export const attempt = ($: Engine, command: string): Promise<unknown> =>
	$.tool
		.call({ tool: "Bash", command, dangerouslyDisableSandbox: true })
		.catch((error: unknown) => error);

/**
 * Runs the commands one after another, so the tool sees them in order.
 *
 * @param $ The test's engine.
 * @param commands The shell commands.
 * @returns Each call's answer or refusal, in order.
 */
export const attemptEach = async (
	$: Engine,
	commands: readonly string[]
): Promise<unknown[]> => {
	const [first, ...rest] = commands;
	if (first === undefined) {
		return [];
	}
	const head = await attempt($, first);
	return [head, ...(await attemptEach($, rest))];
};
