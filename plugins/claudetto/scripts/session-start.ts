import { appendFile } from "node:fs/promises";

/** The lock file of each package manager, in the order that decides a tie. */
const LOCK_FILES: readonly (readonly [file: string, manager: string])[] = [
	["bun.lock", "bun"],
	["bun.lockb", "bun"],
	["pnpm-lock.yaml", "pnpm"],
	["yarn.lock", "yarn"],
	["package-lock.json", "npm"],
	["npm-shrinkwrap.json", "npm"],
	["deno.lock", "deno"],
	["Cargo.lock", "cargo"],
	["uv.lock", "uv"],
	["poetry.lock", "poetry"],
	["pdm.lock", "pdm"],
	["Pipfile.lock", "pipenv"],
	["go.sum", "go"],
	["Gemfile.lock", "bundler"],
	["composer.lock", "composer"],
	["Package.resolved", "swift"],
	["mix.lock", "mix"],
];

/** Enables a Bash command with an unmatched glob or an `==` word under zsh, as under bash. */
export const ZSH_LINE =
	'[ -n "$ZSH_VERSION" ] && setopt no_nomatch no_equals\n';

const nameOf = (field: unknown): string | undefined => {
	if (typeof field !== "string") {
		return undefined;
	}
	const name = field.split("@")[0] ?? "";
	return name === "" ? undefined : name;
};

/** The package manager of `cwd`: the `packageManager` field of `package.json`, then the first lock file found. */
export const detect = async (cwd: string): Promise<string | undefined> => {
	const manifest = Bun.file(`${cwd}/package.json`);
	if (await manifest.exists()) {
		const given: unknown = await manifest.json().catch(() => null);
		const field =
			typeof given === "object" && given !== null && "packageManager" in given
				? given.packageManager
				: undefined;
		const named = nameOf(field);
		if (named !== undefined) {
			return named;
		}
	}
	const present = await Promise.all(
		LOCK_FILES.map(([file]) => Bun.file(`${cwd}/${file}`).exists()),
	);
	return LOCK_FILES.find((_lock, index) => present[index] === true)?.[1];
};

/** The hook output that names `manager` to the model. */
export const contextOf = (manager: string): string =>
	JSON.stringify({
		hookSpecificOutput: {
			hookEventName: "SessionStart",
			additionalContext: `Package manager of this project: \`${manager}\`. Use it for install, add, remove, and run.`,
		},
	});

if (import.meta.main) {
	const input: unknown = await Bun.stdin.json();
	const cwd =
		typeof input === "object" &&
		input !== null &&
		"cwd" in input &&
		typeof input.cwd === "string"
			? input.cwd
			: process.cwd();
	const envFile = process.env["CLAUDE_ENV_FILE"];
	if (envFile !== undefined && envFile !== "") {
		await appendFile(envFile, ZSH_LINE);
	}
	const manager = await detect(cwd);
	if (manager !== undefined) {
		process.stdout.write(contextOf(manager));
	}
}
