// Grades an eval's final replies with TypeSafe Jev Noul questions (issue #124), after `just eval`.
// Reads each case's `jev.yaml`, sends one request per run, and prints scores beside the engine's.
// Usage: bun tools/jev-grade.ts <results dir | stamp dir | aggregate-result.json>
// Needs TYPESAFE_API_KEY. Exit 0 all runs scored, 1 a run errored, 2 usage or missing key.
import type { Fetch } from "./jev-grade/client";
import { errorCount, formatReport } from "./jev-grade/report";
import { gradeResults } from "./jev-grade/run";

/**
 * Runs the CLI.
 *
 * @param argv The arguments after the script name.
 * @param env The environment.
 * @param fetchFn The fetch to use, replaced in tests.
 * @returns The exit code and the text for stdout and stderr.
 */
export async function main(
	argv: readonly string[],
	env: Readonly<Record<string, string | undefined>>,
	fetchFn?: Fetch
): Promise<{ code: number; out: string; err: string }> {
	const [input] = argv;
	if (input === undefined) {
		return {
			code: 2,
			out: "",
			err: "usage: bun tools/jev-grade.ts <results dir | aggregate-result.json>"
		};
	}
	const key = env["TYPESAFE_API_KEY"];
	if (key === undefined || key === "") {
		return {
			code: 2,
			out: "",
			err: "TYPESAFE_API_KEY is not set: export your TypeSafe API key; no request was sent"
		};
	}
	try {
		const graded = await gradeResults({ input, key, fetch: fetchFn });
		return {
			code: errorCount(graded) > 0 ? 1 : 0,
			out: formatReport(graded),
			err: ""
		};
	} catch (error) {
		return {
			code: 2,
			out: "",
			err: error instanceof Error ? error.message : String(error)
		};
	}
}

if (import.meta.main) {
	const { code, out, err } = await main(Bun.argv.slice(2), Bun.env);
	if (out !== "") {
		await Bun.write(Bun.stdout, `${out}\n`);
	}
	if (err !== "") {
		await Bun.write(Bun.stderr, `${err}\n`);
	}
	process.exitCode = code;
}
