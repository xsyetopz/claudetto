import { expect, test } from "bun:test";

import { spawn } from "bun";

const PLUGINS = [
	"claudetto",
	"claudetto-openspec",
	"claudetto-you-should-know",
];
const EVENTS = ["tool.check", "tool.call"];

const fieldOf = (value: unknown, key: string): unknown =>
	typeof value === "object" && value !== null
		? Object.entries(value).find(([k]) => k === key)?.[1]
		: undefined;
const listOf = (value: unknown): unknown[] =>
	Array.isArray(value) ? value : [];

// `--strict` exits 1 on the manifest's missing `version`, so the report is read whatever the exit code.
const guardsOf = async (plugin: string): Promise<unknown[]> => {
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
	return listOf(fieldOf(report, "contents"))
		.flatMap((c) => listOf(fieldOf(c, "gatingHooks")))
		.filter((g) => EVENTS.some((event) => fieldOf(g, "pattern") === event));
};

test.each(PLUGINS)(
	"%s has at most one tool.check and one tool.call hook, each with a .catch",
	async (plugin) => {
		const guards = await guardsOf(plugin);

		expect(guards.length).toBeGreaterThan(0);
		expect(guards.filter((g) => fieldOf(g, "hasCatch") !== true)).toEqual([]);
		for (const event of EVENTS) {
			expect(
				guards.filter((g) => fieldOf(g, "pattern") === event).length,
			).toBeLessThanOrEqual(1);
		}
	},
);
