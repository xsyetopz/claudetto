import { join } from "node:path";
import { parseArgs } from "node:util";
import { type Arm, assertArm, materializeArm } from "../../src/arm/arm.ts";
import { planExperiment, runExperiment, type Experiment, type SessionResult, type Session } from "../../src/ab/ab.ts";
import { mainRequests, readRequests, startFake } from "../../src/fake/fake.ts";
import type { Plan } from "../../src/fake/plan.ts";
import { textGrader } from "../../src/grade/grade.ts";
import { launch } from "../../src/launcher/launcher.ts";
import { firstSentence, readStreamJson } from "../../src/reply/reply.ts";
import { DEFAULT_MODEL } from "../../src/shared/model.ts";
import { createRun } from "../../src/workspace/workspace.ts";

const PROBE = {{json probe}};
const LEDGER = join(import.meta.dir, "../../ledger.jsonl");

interface Case {
	name: string;
	prompt: string;
	plan: Plan;
}

const arms: Arm[] = [
	{ name: "base", plugins: [], model: DEFAULT_MODEL, expect: { model: DEFAULT_MODEL } },
	{
		name: "plugin",
		plugins: [{ dir: {{json pluginDir}} }],
		model: DEFAULT_MODEL,
		expect: { plugins: [{{json pluginName}}], model: DEFAULT_MODEL },
	},
];

const cases: Case[] = [
	{ name: "first", prompt: {{json prompt}}, plan: { steps: [], fallback: { blocks: [{ type: "text", text: "Done." }] } } },
];

const grader = textGrader({
	name: "first sentence",
	classes: { apology: [/\bsorry\b/i, /\bI apologi[sz]e\b/i] },
	examples: [
		{ text: "Done.", label: "ok" },
		{ text: "Sorry, I missed that.", label: "apology" },
	],
});

const experiment: Experiment<Arm, Case> = { name: PROBE, arms, cases, n: 3, parallel: 3, tokenBoundPerRun: 0 };

const session = async (s: Session<Arm, Case>): Promise<SessionResult> => {
	const run = await createRun({ probe: PROBE });
	const requests = join(run.dir, "requests");
	const { pluginDirs, treeHashes } = await materializeArm(s.arm, run);
	const fake = await startFake({ plan: s.case.plan, dir: requests });
	let result: Awaited<ReturnType<typeof launch>>;
	try {
		result = await launch(
			{
				prompt: s.case.prompt,
				mode: "stream-json",
				model: s.arm.model,
				baseUrl: fake.url,
				pluginDirs,
				pluginTreeHashes: treeHashes,
				arm: s.arm.name,
				case: s.case.name,
			},
			run,
		);
	} finally {
		await fake.stop();
	}
	const [first] = mainRequests(await readRequests(requests));
	const armCheck = assertArm(s.arm.expect, {
		debugLog: await Bun.file(result.files.debug).text(),
		firstRequest: first?.body,
	});
	const reply = readStreamJson(await Bun.file(result.files.stdout).text());
	return {
		runId: run.id,
		model: DEFAULT_MODEL,
		// A fake run costs nothing, so the ledger records zero tokens for it.
		usage: { input_tokens: 0, output_tokens: 0 },
		verdict: grader.grade(firstSentence(reply)),
		armCheck,
	};
};

const { values } = parseArgs({ args: Bun.argv.slice(2), options: { run: { type: "boolean", default: false } } });
if (values.run) {
	const report = await runExperiment(experiment, { run: true, ledger: LEDGER, base: "base", margin: 0, session });
	console.log(JSON.stringify({ cases: report.cases, rejected: report.rejected, usd: report.usd }, null, "\t"));
} else {
	const plan = planExperiment(experiment);
	console.log(`plan: ${plan.sessions.length} sessions, bound ${plan.tokenBound} tokens; pass --run to start them`);
}
