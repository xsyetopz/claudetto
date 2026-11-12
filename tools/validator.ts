import { spawn } from "bun";

export const PLUGINS = [
	"claudetto",
	"claudetto-openspec",
	"claudetto-you-should-know",
];

export const fieldOf = (value: unknown, key: string): unknown =>
	typeof value === "object" && value !== null
		? Object.entries(value).find(([k]) => k === key)?.[1]
		: undefined;

export const listOf = (value: unknown): unknown[] =>
	Array.isArray(value) ? value : [];

/** How long a test that reads a report may run: the validator type-checks each plugin, which takes seconds and more on a CI runner. */
export const VALIDATE_MS = 60_000;

const reports = new Map<string, Promise<unknown[]>>();

/** The `contents` of `claude plugin validate --strict --json` for one plugin, run once per test process; `--strict` exits 1 on the manifest's missing `version`, so the report is read whatever the exit code. */
export const contentsOf = (plugin: string): Promise<unknown[]> => {
	const report = reports.get(plugin) ?? validate(plugin);
	reports.set(plugin, report);
	return report;
};

const validate = async (plugin: string): Promise<unknown[]> => {
	const proc = spawn(
		[
			"claude",
			"plugin",
			"validate",
			"--strict",
			"--json",
			`${import.meta.dir}/../plugins/${plugin}`,
		],
		{
			env: { ...process.env, DISABLE_TELEMETRY: "1" },
			stderr: "ignore",
			stdout: "pipe",
		},
	);
	const report: unknown = await new Response(proc.stdout).json();
	return listOf(fieldOf(report, "contents"));
};
