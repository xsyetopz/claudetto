import type { On, PluginOptions } from "claude-code";
import type { Block, BlockContext } from "../block.ts";

export const confine: Block = {
	id: "confine",
	kind: "policy",
	routes: ["session.start", "tool.call"],
	needs: "2.1.314",
};

/** The old `confine` took `on` before it became the boolean `confineEnabled`. */
export const confineOn = (options: PluginOptions): boolean =>
	options["confineEnabled"] === true || options["confine"] === "on";

/** The members of the engine that the block reads, so a test can stand in for it. */
export interface ConfineEngine {
	readonly plugin: { readonly root: string };
	readonly env: {
		get(name: string): Promise<string | undefined>;
		set(name: string, value: string): Promise<unknown>;
	};
	readonly process: {
		run(argv: string[]): Promise<{ exitCode: number; stderr: string }>;
	};
}

const PLAIN_PATH = /^[\w@%+=:,./-]+$/;

const scriptOf = ($: ConfineEngine): string =>
	`${$.plugin.root}/bin/claudetto-confine`;

/** Claude Code puts the prefix into a shell command line, so a path with a space or a quote needs quotes to stay one word. */
const shellWord = (path: string): string =>
	PLAIN_PATH.test(path) ? path : `'${path.replaceAll("'", "'\\''")}'`;

/** Points the shell prefix and the project root at the wrapper when the option is on. */
export const startConfine = async (
	$: ConfineEngine,
	cwd: string,
	options: PluginOptions,
): Promise<void> => {
	if (confineOn(options)) {
		await $.env.set("CLAUDETTO_CONFINE_ROOT", cwd);
		await $.env.set("CLAUDE_CODE_SHELL_PREFIX", shellWord(scriptOf($)));
	}
};

/** Why the call must not run, or `undefined` when confine is off, or the shell prefix is ours and the sandbox program is there. */
export const refusal = async (
	$: ConfineEngine,
	options: PluginOptions,
): Promise<string | undefined> => {
	if (!confineOn(options)) {
		return;
	}
	const script = scriptOf($);
	if ((await $.env.get("CLAUDE_CODE_SHELL_PREFIX")) !== shellWord(script)) {
		return "`confineEnabled` is on but `CLAUDE_CODE_SHELL_PREFIX` is not claudetto's wrapper, so the command would run unconfined. The command was not run. Unset `CLAUDE_CODE_SHELL_PREFIX` in the settings `env` or set `confineEnabled` to `false`.";
	}
	const checked = await $.process.run([script, "--check", "--"]);
	return checked.exitCode === 0 ? undefined : checked.stderr.trim();
};

/** A failed guard is skipped and the call would run unconfined, so this refuses in its place. */
export const failedGuard = (
	options: PluginOptions,
	called: boolean,
): string | undefined =>
	confineOn(options) && !called
		? "`confine` could not check the sandbox. The command was not run."
		: undefined;

export const attachConfine = (on: On, context: BlockContext): void => {
	// The prefix wraps the whole shell command after the permission check and the auto mode classifier, so both judge the command the model wrote.
	on("session.start", { isInteractive: [true, false] }, async ($, e, next) => {
		await startConfine($, e.cwd, context.options);
		return next(e);
	});
	on("tool.call", { tool: "Bash" }, async ($, e, next) => {
		const reason = await refusal($, context.options);
		return reason === undefined ? next(e) : { deny: reason };
	}).catch((_$, e, next) => {
		const reason = failedGuard(context.options, next.called);
		return reason === undefined ? next(e) : { deny: reason };
	});
};
