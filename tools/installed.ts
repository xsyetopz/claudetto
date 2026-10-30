import { realpath } from "node:fs/promises";
import { file as bunFile, spawn } from "bun";

const output = async (argv: readonly string[]): Promise<string | undefined> => {
	const child = spawn([...argv], { stdout: "pipe", stderr: "ignore" });
	const text = await new Response(child.stdout).text();
	const code = await child.exited;
	return code === 0 ? text : undefined;
};

/**
 * The smallest file that can hold the harness. The native install is one 276 MB binary and the npm
 * build is a bundle of tens of megabytes, while a launcher that forwards to either is a few
 * kilobytes and holds no key name, so a file under this size is reported as no program rather than
 * as a program missing every key.
 */
const MIN_PROGRAM_BYTES = 1_000_000;

/**
 * The file of the installed program: `CLAUDE_PIN_PROGRAM` when it is set, otherwise whatever
 * `claude` resolves to, with its symlinks followed. None when no `claude` is on the path and none
 * when what it resolves to is too small to be the program, which is how a machine without the CLI is
 * told apart from a failed read.
 */
export const installedProgram = async (): Promise<string | undefined> => {
	const override = process.env["CLAUDE_PIN_PROGRAM"];
	if (override !== undefined && override !== "") {
		return override;
	}
	const found = (await output(["which", "claude"]))?.trim();
	if (found === undefined || found === "") {
		return undefined;
	}
	const program = await realpath(found);
	return bunFile(program).size >= MIN_PROGRAM_BYTES ? program : undefined;
};

/**
 * The strings of `names` that the program file does not hold, in the order of `names`. The file is
 * read once into one buffer and each name is searched for in it, because `grep -o` over the 276 MB
 * program takes about 16 s against about 0.3 s here.
 */
export const stringsMissing = async (
	program: string,
	names: readonly string[],
): Promise<readonly string[]> => {
	const bytes = await bunFile(program).bytes();
	const haystack = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.length);
	return names.filter((name) => haystack.indexOf(name) < 0);
};
