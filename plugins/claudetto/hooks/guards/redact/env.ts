import type { EngineInterface } from "claude-code";

/** Values shorter than this stay visible: `1`, `true` or `dev` would mask ordinary output and hide no secret. */
export const MIN_VALUE = 6;

/**
 * Env-style secret files by name, not by a fixed list: `.env`, `.env.<stage>`, `<name>.env`, `.envrc`,
 * `secrets.<ext>`. Templates (`.example`, `.sample`, `.template`, `.dist`) hold placeholders and stay readable.
 */
export const isEnvFile = (name: string): boolean =>
	/^(?:\.env(?:\..+)?|.+\.env|\.envrc|\.?secrets?(?:\..+)?)$/iu.test(name) &&
	!/\.(?:example|sample|template|dist)$/iu.test(name);

/** Directories searched for env-style files, besides the project root. */
const ENV_DIRS: readonly string[] = ["", "config", ".config"];

/**
 * Reads the values of a dotenv file: `KEY=value`, `export KEY=value`, quoted or bare,
 * with a trailing ` #` comment dropped from a bare value.
 *
 * @param text The file's text.
 * @returns Each value at least MIN_VALUE characters long.
 */
export const envValues = (text: string): string[] => {
	const values = new Set<string>();
	for (const line of text.split(/\r?\n/u)) {
		const match =
			/^\s*(?:export\s+)?[A-Za-z_][A-Za-z0-9_.-]*\s*=\s*(.*)$/u.exec(line);
		if (match?.[1] === undefined) {
			continue;
		}
		const raw = match[1].trim();
		const quoted = /^(["'`])(.*)\1$/u.exec(raw);
		const value = quoted?.[2] ?? raw.replace(/\s+#.*$/u, "");
		if (value.length >= MIN_VALUE) {
			values.add(value);
		}
	}
	return [...values];
};

/** The values of the env-style files in one directory, in listing order. */
async function dirSecrets(
	$: EngineInterface,
	root: string,
	dir: string
): Promise<string[]> {
	const path = dir === "" ? root : `${root}/${dir}`;
	if (!(await $.fs.exists(path))) {
		return [];
	}
	const entries = await $.fs.list(path);
	const files = entries.filter(
		(entry) => entry.kind === "file" && isEnvFile(entry.name)
	);
	const texts = await Promise.all(
		files.map((entry) => $.fs.read(`${path}/${entry.name}`))
	);
	return texts.flatMap((text) => envValues(text));
}

/**
 * The values of every env-style file in the project, which the engine's
 * hook check follows only through a function declaration.
 *
 * @param $ The engine.
 * @returns Each secret value the files hold.
 */
export async function envSecrets($: EngineInterface): Promise<string[]> {
	const root = await $.session.root();
	const found = await Promise.all(
		ENV_DIRS.map((dir) => dirSecrets($, root, dir))
	);
	return found.flat();
}
