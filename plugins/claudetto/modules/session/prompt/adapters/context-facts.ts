// The facts of the `prompt` slice that `prompt.context` reads once: the shell and the Mythos access for the process, and the repository for each session.

import { readChanges } from "../../../project/domain/change.ts";
import {
	CHANGES_DIR,
	CLAUDE_STATE_FILE,
} from "../../../project/domain/paths.ts";
import { shellFacts } from "../domain/environment.ts";
import { hasMythos, repoFacts, usesUgrep } from "../domain/facts.ts";
import { FACT_CHANGES_MAX, FACT_RUN_TIMEOUT_MS } from "../limits.ts";

/** The calls that the helpers make. The mod gives each call, because the mod runtime follows `$` into no imported arrow function. */
export interface FactsPort {
	readonly env: Readonly<
		Record<
			| "CLAUDE_CODE_ENTRYPOINT"
			| "CLAUDE_CODE_EXECPATH"
			| "CLAUDE_CONFIG_DIR"
			| "HOME"
			| "SHELL",
			() => Promise<string | undefined>
		>
	>;
	readonly fs: {
		list: Parameters<typeof readChanges>[1]["list"];
		read: (file: string) => Promise<string>;
	};
	readonly process: {
		run: (
			argv: string[],
			options?: { cwd: string; timeoutMs: number },
		) => Promise<{ exitCode: number; stdout: string }>;
	};
	readonly session: { cwd: () => Promise<string>; id: () => Promise<string> };
	readonly tool: { list: () => Promise<readonly { name: string }[]> };
}

/** The value of an env read, or `""` when it is unset or the read fails. */
const envValue = async (read: Promise<string | undefined>): Promise<string> => {
	try {
		return (await read) ?? "";
	} catch {
		return "";
	}
};

/** The output of a run, or `""` when it fails. */
const output = async (
	run: Promise<{ exitCode: number; stdout: string }>,
): Promise<string> => {
	try {
		const r = await run;
		return r.exitCode === 0 ? r.stdout : "";
	} catch {
		return "";
	}
};

/** The names of the tools that are on, or `Grep` alone when the read fails, so the block never claims `ugrep` from a guess. */
const toolNamesOf = async (io: FactsPort): Promise<string[]> => {
	try {
		return (await io.tool.list()).map((t) => t.name);
	} catch {
		return ["Grep"];
	}
};

/** The shell facts of this process: `uname -s` runs one time, and a failed run gives no platform. */
let facts: Promise<string> | undefined;
export const shellFactsOf = (io: FactsPort): Promise<string> => {
	facts ??= (async () => {
		const [platform, shell] = await Promise.all([
			output(io.process.run(["uname", "-s"])),
			envValue(io.env.SHELL()),
		]);
		return shellFacts(platform, shell);
	})();
	return facts;
};

/** The repository facts of this session: the runs go one time for each session id, so `/clear` and `/resume` read them again, and a failed run gives an empty fact, because a throw here drops the `context_management` block too. */
let repo: { id: string; text: Promise<string> } | undefined;
export const repoFactsOf = async (io: FactsPort): Promise<string> => {
	const id = await io.session.id().catch(() => "");
	if (repo?.id === id) {
		return repo.text;
	}
	const text = (async () => {
		const cwd = await io.session.cwd().catch(() => "");
		if (cwd === "") {
			return "";
		}
		const out = (argv: string[]) =>
			output(io.process.run(argv, { cwd, timeoutMs: FACT_RUN_TIMEOUT_MS }));
		const [branch, tag, shell, execPath, entrypoint, toolNames, changes] =
			await Promise.all([
				out(["git", "branch", "--show-current"]),
				out(["git", "describe", "--tags", "--abbrev=0"]),
				envValue(io.env.SHELL()),
				envValue(io.env.CLAUDE_CODE_EXECPATH()),
				envValue(io.env.CLAUDE_CODE_ENTRYPOINT()),
				toolNamesOf(io),
				readChanges(
					`${cwd}/${CHANGES_DIR}`,
					{ list: (dir) => io.fs.list(dir), read: (file) => io.fs.read(file) },
					FACT_CHANGES_MAX,
				),
			]);
		const ugrep = usesUgrep({ execPath, toolNames, entrypoint });
		return repoFacts({ branch, tag, changes, shell, ugrep });
	})();
	repo = { id, text };
	return text;
};

/** Whether this login has Mythos, read one time from `.claude.json` in `CLAUDE_CONFIG_DIR` or the home folder. A failed read counts as no access. */
let mythos: Promise<boolean> | undefined;
export const mythosOf = (io: FactsPort): Promise<boolean> => {
	mythos ??= (async () => {
		const dir =
			(await envValue(io.env.CLAUDE_CONFIG_DIR())) ||
			(await envValue(io.env.HOME()));
		const file = `${dir}/${CLAUDE_STATE_FILE}`;
		return dir !== "" && hasMythos(await io.fs.read(file).catch(() => ""));
	})();
	return mythos;
};
