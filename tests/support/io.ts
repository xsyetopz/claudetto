// The output of a CLI `main` in this process, for a test to read.

/** An `io` that keeps each printed line, and `text` that gives them as one string. */
export const captureIo = () => {
	const lines: string[] = [];
	const keep = (l: string) => void lines.push(l);
	return { io: { log: keep, error: keep }, text: () => lines.join("\n") };
};

/** The output and the exit code of a process that runs with piped `stdout` and `stderr`, after it exits. */
export const outputOf = async (proc: {
	stdout: ReadableStream;
	stderr: ReadableStream;
	exited: Promise<number>;
}) => {
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	return { stdout, stderr, exitCode };
};
