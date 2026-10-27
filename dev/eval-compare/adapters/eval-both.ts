import { mkdtemp, realpath, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { file as bunFile, spawn as bunSpawn } from "bun";
import {
	type Arm,
	armHeading,
	type Expected,
	evalArgs,
	modelOf,
	verdict,
} from "../compare.ts";

export type Spawn = (
	file: string,
	args: string[],
) => Promise<{ exitCode?: number | null | undefined } | null>;

const spawn: Spawn = async (file, args) => {
	try {
		const child = bunSpawn([file, ...args], {
			stdio: ["inherit", "inherit", "inherit"],
		});
		return { exitCode: await child.exited };
	} catch {
		return null;
	}
};

const evalOf = async (
	plugin: string,
	opts: string[],
	json: string,
	run: Spawn,
): Promise<Arm> => {
	const code =
		(await run("claude", evalArgs(plugin, opts, json)))?.exitCode ?? 1;
	const file = bunFile(json);
	return { code, result: (await file.exists()) ? await file.text() : null };
};

/** The arm of the plugin folder `dir`: the folder as given and with links resolved, because the result may hold either. */
const expectedOf = async (dir: string, opts: string[]): Promise<Expected> => {
	const real = await realpath(dir).catch(() => dir);
	const model = modelOf(opts);
	return {
		plugins: [...new Set([dir, real])],
		...(model === undefined ? {} : { model }),
	};
};

export const runBoth = async (
	a: string,
	b: string,
	rest: string[],
	run: Spawn = spawn,
	log: (line: string) => void = (line) => {
		process.stdout.write(`${line}\n`);
	},
): Promise<number> => {
	const first = path.resolve(a);
	const second = path.resolve(b);
	const dir = await mkdtemp(path.join(os.tmpdir(), "claudetto-eval-"));
	try {
		log(armHeading("A", first));
		const x = await evalOf(first, rest, path.join(dir, "a.json"), run);
		log(armHeading("B", second));
		const y = await evalOf(second, rest, path.join(dir, "b.json"), run);
		const result = verdict(x, y, [
			await expectedOf(first, rest),
			await expectedOf(second, rest),
		]);
		for (const line of result.lines) {
			log(line);
		}
		return result.code;
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
};
