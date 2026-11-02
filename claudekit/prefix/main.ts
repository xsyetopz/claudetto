#!/usr/bin/env -S bun --no-env-file
// Usage: bun claudekit/prefix/main.ts NAME... | --list
// Runs each named scenario in an interactive session against the fake API and prints, for every request, whether the
// prefix of the one before it is kept. Nothing reaches a provider.

import { lineOf, pairsOf } from "./report.ts";
import { SCENARIOS } from "./scenarios.ts";
import { inOrder, runScenario } from "./session.ts";

const main = async (names: readonly string[]): Promise<void> => {
	if (names.length === 0 || names.includes("--list")) {
		console.info(Object.keys(SCENARIOS).join("\n"));
		return;
	}
	await inOrder(names, runNamed);
};

const runNamed = async (name: string): Promise<void> => {
	const scenario = SCENARIOS[name];
	if (scenario === undefined) {
		console.error(`no scenario ${name}`);
		process.exitCode = 1;
		return;
	}
	const run = await runScenario(scenario);
	console.info(
		`## ${name} (${run.mains.length} main of ${run.all.length} requests, bodies in ${run.root})`,
	);
	run.mains.forEach((raw, at) => {
		console.info(`  ${at}: ${lineOf(raw)}`);
	});
	pairsOf(run.mains).forEach((pair, at) => {
		console.info(`  ${at} -> ${at + 1}: ${JSON.stringify(pair.diff)}`);
		for (const value of pair.values) {
			console.info(`      ${value}`);
		}
	});
};

await main(process.argv.slice(2));
