const ENV_NAME = /^(?:[\w-]*\.env|\.env\.[\w.-]+)$/;

/** Sample lines a names-only pattern is run on: the value has letters, digits, spaces, and a second `=`. */
const SAMPLES = ["A_B1=v4lue-9 x", "Zz=a=b c", "export K_2=v"];

export const isEnvName = (word: string): boolean =>
	ENV_NAME.test(word.slice(word.lastIndexOf("/") + 1));

/** True when the pattern, run with `grep -o`, matches only up to the first `=` of a line, so no value is printed. A pattern that does not compile is not names-only. */
export const namesOnly = (pattern: string): boolean => {
	try {
		const re = new RegExp(pattern, "gm");
		return SAMPLES.every((line) =>
			[...line.matchAll(re)].every(
				(m) => m.index + m[0].length <= line.indexOf("=") + 1,
			),
		);
	} catch {
		return false;
	}
};

const ASSIGNMENT = /^(\s*(?:export\s+)?[\w.-]+\s*=)(.*)$/;

const REDACTED = "[REDACTED]";

/** A line that is neither blank, a comment, nor `NAME=value` continues a multi-line value, so it goes whole. */
export const redactEnv = (content: string): string =>
	content
		.split("\n")
		.map((line) => {
			if (line.trim() === "" || line.trimStart().startsWith("#")) {
				return line;
			}
			const m = ASSIGNMENT.exec(line);
			return m ? `${m[1]}${REDACTED}` : REDACTED;
		})
		.join("\n");
