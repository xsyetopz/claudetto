import { realpath } from "node:fs/promises";
import { file as bunFile, spawn } from "bun";

const output = async (argv: readonly string[]): Promise<string | undefined> => {
	const child = spawn([...argv], { stdout: "pipe", stderr: "ignore" });
	const text = await new Response(child.stdout).text();
	const code = await child.exited;
	return code === 0 ? text : undefined;
};

/** Under this size a file is a launcher that holds no key name, so it is no program. */
const MIN_PROGRAM_BYTES = 1_000_000;

/** None when `claude` is missing or too small to be the program, which tells no CLI from a failed read. */
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

/** Read once into one buffer, because `grep -o` over the whole program is far slower. */
export const stringsMissing = async (
	program: string,
	names: readonly string[],
): Promise<readonly string[]> => {
	const bytes = await bunFile(program).bytes();
	const haystack = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.length);
	return names.filter((name) => haystack.indexOf(name) < 0);
};
