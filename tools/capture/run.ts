#!/usr/bin/env bun

import { mkdir } from "node:fs/promises";
import { argv } from "node:process";
import { file as bunFile } from "bun";
import { count } from "../../plugins/claudetto/src/format.ts";
import { ARMS, type Arm, capture, PROMPT } from "./arm.ts";
import type { Score } from "./score.ts";
import { denySettings, shippedSettings } from "./settings.ts";

const argOf = (args: readonly string[], name: string): string | undefined => {
	const at = args.indexOf(`--${name}`);
	return at >= 0 ? args[at + 1] : undefined;
};

const settingsOf = async (options: {
	file: string | undefined;
	deny: string | undefined;
	shipped: boolean;
}): Promise<string | undefined> => {
	if (options.shipped) {
		return shippedSettings();
	}
	if (options.deny !== undefined) {
		return denySettings(options.deny.split(","));
	}
	return options.file === undefined
		? undefined
		: await bunFile(options.file).text();
};

const row = (arm: Arm, score: Score): void => {
	console.info(
		`  ${arm.padEnd(6)} | total ${count(score.total).padStart(7)} | system ${count(score.system).padStart(7)} | tools ${count(score.tools).padStart(7)} (${score.toolCount}) | messages ${count(score.messages).padStart(6)}`,
	);
};

const main = async (): Promise<void> => {
	const args = argv.slice(2);
	const only = argOf(args, "arm");
	const file = argOf(args, "settings");
	const deny = argOf(args, "deny");
	const settings = await settingsOf({
		file,
		deny,
		shipped: args.includes("--shipped"),
	});
	const tools = Number(argOf(args, "tools") ?? 0);
	const arms = ARMS.filter((arm) => only === undefined || only === arm);
	if (arms.length === 0) {
		console.error(`--arm takes one of ${ARMS.join(", ")}`);
		process.exitCode = 1;
		return;
	}
	console.info(
		"Each arm runs `claude -p` against a fake Messages API on 127.0.0.1. No provider is reached.",
	);
	console.info(`Settings of each run: ${settings ?? "the defaults"}`);
	const dump = argOf(args, "dump");
	const prompt = argOf(args, "prompt") ?? PROMPT;
	if (dump !== undefined) {
		await mkdir(dump, { recursive: true });
	}
	const readings = await Promise.all(
		arms.map((arm) => capture(arm, settings, dump, prompt)),
	);
	console.info("\nThe characters of the first request:");
	for (const reading of readings) {
		if (reading.score === undefined) {
			console.error(
				`  ${reading.arm}: no request was sent (exit ${reading.code}). ${reading.stderr}`,
			);
			process.exitCode = 1;
			continue;
		}
		row(reading.arm, reading.score);
	}
	for (const reading of readings) {
		if (reading.score === undefined) {
			continue;
		}
		console.info(
			`\n  ${reading.arm}: ${reading.requests} request(s) to the messages route, ${reading.others} to another route, working folder path ${reading.workChars} chars`,
		);
		console.info(
			`  ${reading.arm}: system blocks ${reading.score.blocks.join(", ")}`,
		);
		for (const tool of reading.score.perTool.slice(0, tools)) {
			console.info(
				`  ${reading.arm}: tool ${tool.name} ${count(tool.chars)}, description ${count(tool.desc)}`,
			);
		}
	}
};

if (import.meta.main) {
	await main();
}
