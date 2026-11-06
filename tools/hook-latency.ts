import { resolve } from "node:path";
import { file, stdout, write } from "bun";
import { startFake } from "../claudekit/src/fake/fake.ts";
import type { Plan } from "../claudekit/src/fake/plan.ts";
import { launch } from "../claudekit/src/launcher/launcher.ts";
import { MODELS } from "../claudekit/src/shared/model.ts";
import {
	firstRequestAt,
	type Mark,
	type Settle,
	timeline,
} from "../claudekit/src/timing/timing.ts";
import { createRun } from "../claudekit/src/workspace/workspace.ts";

// Offline: one Bash call, then a text answer, from the fake API. `settled in` times of tool.call include next(), so they hold the Bash run itself.
const PLAN: Plan = {
	steps: [
		{
			match: { hasTools: true },
			reply: {
				blocks: [
					{ type: "tool_use", name: "Bash", input: { command: "echo hi" } },
				],
				stop: "tool_use",
			},
		},
	],
	fallback: { blocks: [{ type: "text", text: "Done." }] },
};
const RUNS = 3;

const pluginDir = process.argv[2];
if (!pluginDir) {
	throw new Error("usage: bun tools/hook-latency.ts <pluginDir>");
}

const oneRun = async (dir: string): Promise<Mark[]> => {
	const run = await createRun({ probe: "hook-latency", quiet: true });
	const fake = await startFake({ plan: PLAN, dir: `${run.dir}/requests` });
	try {
		const result = await launch(
			{
				prompt: "RUN:echo hi",
				mode: "json",
				model: MODELS.haiku,
				pluginDirs: [dir],
				settings: { permissions: { allow: ["Bash"] } },
				baseUrl: fake.url,
				timeoutMs: 120_000,
			},
			run,
		);
		return timeline(await file(result.files.debug).text());
	} finally {
		await fake.stop();
	}
};

const mean = (xs: number[]): number => {
	let sum = 0;
	for (const x of xs) {
		sum += x;
	}
	return sum / xs.length;
};
const cell = (n: number): string => n.toFixed(1).padStart(9);

// One after another: parallel sessions would load each other's hooks.
const inSequence = async (
	left: number,
	done: Mark[][] = [],
): Promise<Mark[][]> =>
	left === 0
		? done
		: inSequence(left - 1, [...done, await oneRun(resolve(pluginDir))]);
const all = await inSequence(RUNS);

const starts = all.flatMap((marks) => firstRequestAt(marks) ?? []);
const submits = all.flatMap(
	(marks) =>
		marks.find((m) => m.kind === "settled" && m.event === "prompt.submit")
			?.at ?? [],
);
const groups = new Map<string, number[]>();
for (const s of all.flat().filter((m): m is Settle => m.kind === "settled")) {
	const key = `${s.module} ${s.event}`;
	groups.set(key, [...(groups.get(key) ?? []), s.ms]);
}

const lines = [
	`plugin ${resolve(pluginDir)}, ${RUNS} runs, prompt RUN:echo hi`,
];
lines.push(
	`session start, first API request at ms: ${starts.map((n) => n.toFixed(0)).join(", ") || "absent"}`,
);
lines.push(
	`session start, first prompt.submit settled at ms: ${submits.map((n) => n.toFixed(0)).join(", ") || "absent"}`,
);
lines.push(
	`${"module event".padEnd(44)}${"calls".padStart(6)}${"mean ms".padStart(9)}${"max ms".padStart(9)}`,
);
for (const [key, ms] of [...groups].sort((a, b) => mean(b[1]) - mean(a[1]))) {
	lines.push(
		`${key.padEnd(44)}${String(ms.length).padStart(6)}${cell(mean(ms))}${cell(Math.max(...ms))}`,
	);
}
await write(stdout, `${lines.join("\n")}\n`);
