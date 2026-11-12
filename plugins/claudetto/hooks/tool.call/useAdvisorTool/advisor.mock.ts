import type { ModelCompleteResult, On } from "claude-code";
import type { Engine } from "claude-code/testing";

import { haikuText } from "../../decider/decider.mock";
import { scanner } from "../../secrets.mock";

declare module "claude-code" {
	interface McpToolInputs {
		/** The advisor tool's arguments, so a lab calls it with typed input. */
		mcp__claudetto__advisor: { question?: string; files?: string | string[] };
	}
}

export const ADVISOR = "mcp__claudetto__advisor";

/** One `model.complete` request as the lab saw it. */
export interface Sent {
	model: string;
	effort: string | undefined;
	system: string | undefined;
	prompt: string;
}

interface Rig {
	/** The files the lab holds, by absolute path. */
	readonly files?: Readonly<Record<string, string>>;
	/** Paths the session's read rules deny. */
	readonly denied?: readonly string[];
	/** The model's answer. */
	readonly answer?: ModelCompleteResult;
	/** True: the secret scanner cannot run. */
	readonly scanFails?: boolean;
	/** The variables the environment holds. */
	readonly env?: Readonly<Record<string, string>>;
	/** Secrets the scanner finds in the text it is given. */
	readonly secrets?: readonly string[];
}

/** A lab with a working directory of `/repo`, the files and read rules of `rig`, and a model that answers `rig.answer`. */
export const stub = (on: On, rig: Rig = {}) => {
	const sent: Sent[] = [];
	const read: string[] = [];
	const checked: string[] = [];
	if (rig.scanFails === true) {
		on("process.run", () => {
			throw new Error("scanner crashed");
		});
	} else {
		scanner(on, rig.secrets ?? []);
	}
	on("env.get", (_$, e) => ({ value: rig.env?.[e.name] }));
	on("session.cwd", () => ({ value: "/repo" }));
	on("tool.check", (_$, e) => {
		const path = String(Reflect.get(new Object(e.input), "file_path"));
		checked.push(path);
		return {
			decision: rig.denied?.includes(path) === true ? "deny" : "allow",
			reason: "a rule",
		};
	});
	on("fs.read", (_$, e) => {
		read.push(e.path);
		const text = rig.files?.[e.path];
		if (text === undefined) {
			throw new Error(`ENOENT: ${e.path}`);
		}
		return { value: text };
	});
	on("model.complete", (_$, e) => {
		sent.push({
			model: e.model,
			effort: e.effort,
			system: e.system,
			prompt: e.prompt,
		});
		return { value: rig.answer ?? haikuText("Use a queue.") };
	});
	on("tool.call", (_$, e, next) =>
		[ADVISOR].includes(e.tool) ? next(e) : { result: "ran" },
	);
	return { sent, read, checked };
};

/** The text of the answer to one `advisor` call. */
export const advise = async (
	$: Engine,
	input: { question?: string; files?: string | string[] },
) => {
	const answer = await $.tool.call({ tool: ADVISOR, ...input });
	return typeof answer.result === "string" ? answer.result : "";
};

/** The names the session registers as tools and as commands. */
export const registeredNames = async ($: Engine, on: On) => {
	const tools: string[] = [];
	const commands: string[] = [];
	on("session.start", () => ({ cwd: "/repo" }));
	on("tool.register", (_$, e) => {
		tools.push(e.name);
		return { value: { tool: `mcp__claudetto__${e.name}` } };
	});
	on("command.register", (_$, e) => {
		commands.push(e.name);
		return { value: { command: e.name } };
	});
	await $.session.start({ cwd: "/repo", surface: null, isInteractive: false });
	return { tools, commands };
};
