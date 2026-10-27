import { mkdir, realpath } from "node:fs/promises";
import path from "node:path";
import { file, spawn, which, write } from "bun";
import { buildSchemas, schemaFiles } from "../domain/build.ts";
import { USAGE } from "../prompts.ts";

const SEMVER_EXACT = /^\d+\.\d+\.\d+$/;
const SEMVER_FIND = /\d+\.\d+\.\d+/;

const opt = (argv: string[], name: string): string | undefined => {
	const at = argv.indexOf(name);
	return at < 0 ? undefined : argv[at + 1];
};

export const installedBundle = async (): Promise<string> => {
	const bin = which("claude");
	if (!bin) {
		throw new Error("claude is not on PATH.");
	}
	const platformBin = path.join(
		path.dirname(bin),
		"..",
		"install",
		"global",
		"node_modules",
		"@anthropic-ai",
		`claude-code-${process.platform}-${process.arch}`,
		"claude",
	);
	return (await file(platformBin).exists()) ? platformBin : realpath(bin);
};

export const versionOf = async (bundle: string): Promise<string> => {
	const base = path.basename(bundle);
	if (SEMVER_EXACT.test(base)) {
		return base;
	}
	const child = spawn([bundle, "--version"], {
		stdout: "pipe",
		stderr: "ignore",
	});
	const [exitCode, stdout] = await Promise.all([
		child.exited,
		new Response(child.stdout).text(),
	]);
	if (exitCode !== 0) {
		throw new Error(`${bundle} --version exited with ${exitCode}.`);
	}
	return SEMVER_FIND.exec(stdout)?.[0] ?? "unknown";
};

export const main = async (argv: string[]): Promise<number> => {
	if (argv.includes("--help") || argv.includes("-h")) {
		process.stdout.write(`${USAGE}\n`);
		return 0;
	}
	const outDir = opt(argv, "--out");
	if (!outDir) {
		console.error(`schema: --out is required.\n${USAGE}`);
		return 2;
	}
	try {
		const given = opt(argv, "--bundle");
		const bundle = given ?? (await installedBundle());
		const asked = opt(argv, "--version");
		if (asked && !given) {
			const installed = await versionOf(bundle);
			if (installed !== asked) {
				throw new Error(
					`Claude Code ${asked} is not installed, the installed version is ${installed}`,
				);
			}
		}
		const version = asked ?? (await versionOf(bundle));
		const src = Buffer.from(await file(bundle).arrayBuffer()).toString(
			"latin1",
		);
		const schemas = buildSchemas(src, version);
		const out = path.resolve(outDir);
		await mkdir(out, { recursive: true });
		const files = schemaFiles();
		await Promise.all(
			(["user", "managed"] as const).map((kind) =>
				write(
					path.join(out, files[kind]),
					`${JSON.stringify(schemas[kind], null, 2)}\n`,
				),
			),
		);
		process.stdout.write(
			`Claude Code ${version}: ${Object.keys(schemas.user.properties ?? {}).length} top-level keys\n`,
		);
		for (const name of Object.values(files)) {
			process.stdout.write(`${path.join(out, name)}\n`);
		}
		return 0;
	} catch (err) {
		console.error(
			`schema: ${err instanceof Error ? err.message : String(err)}`,
		);
		return 1;
	}
};
