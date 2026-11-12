// The one road of the tuning runs: it writes a job file into the payload folder, bundles the plugin in `tools/claim-check-plugin` there, and starts `claude -p` with it; its `session.start` hook scores the cases on the engine's `$`.
// Every model call goes through `$.model.complete` under the Claude Code login, so a run counts against the subscription's weekly token limit.
// `TYPESAFE_API_KEY` is read from the environment and never printed or written; `.env` is loaded only when `bun --env-file=.env` says so.
// `--prices` is JSON of USD per million tokens: {"claude-haiku-5-5": {"input", "output", "cacheRead", "cacheWrite"}, "claude-sonnet-5-5": {...}},
// copied from the Anthropic pricing page (https://platform.claude.com/docs/en/about-claude/pricing). It prices the API list-price equivalent and the `--max-usd` cap.
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { build, env, file, spawn, write } from "bun";

import { JEV_ORIGIN } from "./claim-check-plugin/hooks/client.ts";
import type { Job, Kind } from "./claim-check-plugin/hooks/run.ts";
import { fail, field, numberOf, pricesOf } from "./claim-check-prices.ts";
import { subscriptionEnv } from "./subscription.ts";

const PLUGIN_SOURCE = resolve(import.meta.dir, "claim-check-plugin");
const BUNFIG = resolve(import.meta.dir, "../bunfig.toml");

const OPTIONS = {
	summary: { type: "string" },
	prices: { type: "string" },
	"max-usd": { type: "string" },
	"typesafe-base-url": { type: "string", default: JEV_ORIGIN },
} as const;

const keyHint = async (script: string): Promise<string> =>
	/^\s*env\s*=\s*false\b/mu.test(await file(BUNFIG).text())
		? `Run it as \`bun --env-file=.env ${script} ...\`, because bunfig.toml turns \`.env\` loading off.`
		: "Set it in the shell or in a .env file Bun loads.";

const job = async (kind: Kind, script: string): Promise<Job> => {
	const { values, positionals } = parseArgs({
		allowPositionals: true,
		options: OPTIONS,
	});
	const [casesPath, outDir] = positionals;
	const maxUsd = Number(values["max-usd"]);
	const { summary, prices } = values;
	if (
		casesPath === undefined ||
		outDir === undefined ||
		summary === undefined ||
		prices === undefined ||
		!(maxUsd > 0)
	) {
		return fail(
			`Usage: bun ${script} <cases.jsonl> <payload-folder> --summary <file.md> --prices <file.json> --max-usd <n> [--typesafe-base-url <url>]`,
		);
	}
	if (env["TYPESAFE_API_KEY"] === undefined) {
		return fail(`TYPESAFE_API_KEY is not set. ${await keyHint(script)}`);
	}
	return {
		kind,
		cases: await file(casesPath).text(),
		prices: pricesOf(await file(prices).json(), prices),
		maxUsd,
		typesafeUrl: values["typesafe-base-url"],
		outDir: resolve(outDir),
		summaryPath: resolve(summary),
		finalPath: resolve(outDir, "final.json"),
	};
};

// The engine reads a module's exports only as function declarations (`export function name`), and a bundle lists them in a closing `export { ... }`, so each is moved onto its declaration.
const exportInline = (code: string): string => {
	let text = code.replace(/\nexport \{[^}]*\};?\s*$/u, "\n");
	for (const name of ["jobOf", "runJob"]) {
		text = text.replace(
			new RegExp(`\\n(async function|function) ${name}\\b`, "u"),
			(_, kind: string) => `\nexport ${kind} ${name}`,
		);
	}
	return text;
};

// The engine refuses a module outside the plugin's folder, so the scoring and the modules it imports are bundled into a copy of the plugin in the payload folder.
export const bundlePlugin = async (outDir: string): Promise<string> => {
	const dir = `${outDir}/plugin`;
	const built = await build({
		entrypoints: [`${PLUGIN_SOURCE}/hooks/run.ts`],
		target: "browser",
		external: ["claude-code"],
	});
	const [bundle] = built.outputs;
	if (!built.success || bundle === undefined) {
		return fail(
			`The plugin did not bundle: ${built.logs.map((log) => log.message).join("; ")}`,
		);
	}
	await write(`${dir}/hooks/run.ts`, exportInline(await bundle.text()));
	await Promise.all(
		[".claude-plugin/plugin.json", "hooks/hooks.json", "hooks/register.ts"].map(
			(path) => write(`${dir}/${path}`, file(`${PLUGIN_SOURCE}/${path}`)),
		),
	);
	return dir;
};

const run = async (kind: Kind, script: string): Promise<number> => {
	const given = await job(kind, script);
	const jobPath = `${given.outDir}/job.json`;
	await write(jobPath, JSON.stringify(given));
	const proc = spawn(
		[
			"claude",
			"-p",
			"Reply ok",
			"--plugin-dir",
			await bundlePlugin(given.outDir),
			"--model",
			"haiku",
			"--no-session-persistence",
			"--debug-file",
			`${given.outDir}/debug.log`,
		],
		{
			cwd: given.outDir,
			env: { ...subscriptionEnv(env), CLAIM_CHECK_JOB: jobPath },
			stdout: "ignore",
			stderr: "inherit",
		},
	);
	await proc.exited;
	const done = file(given.finalPath);
	if (!(await done.exists())) {
		return fail(
			`The run left no final line. Read ${given.outDir}/debug.log for the hook's error.`,
		);
	}
	const final: unknown = await done.json();
	console.info(String(field(final, "line")));
	return numberOf(field(final, "code"));
};

/** Runs the tuning run `kind` from the command line `script` and returns its exit code. */
export const launch = async (kind: Kind, script: string): Promise<number> => {
	try {
		return await run(kind, script);
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		return 1;
	}
};
