import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { startFake } from "../fake/fake.ts";
import { claudeVersion, launch, launchEnv, runFiles } from "../launcher/launcher.ts";
import { DEFAULT_MODEL } from "../shared/model.ts";
import { tempDir } from "../shared/temp.ts";
import { createRun } from "../workspace/workspace.ts";

// Generated per version and about 23,000 lines, so it stays out of git (`claudekit/.gitignore`).
export const ENGINE_TYPES = join(import.meta.dir, "..", "..", "types", "claude-code.d.ts");
const KIT_TSCONFIG = join(import.meta.dir, "..", "..", "tsconfig.json");
const HEADER = /^\/\/ Written by Claude Code (\S+)\./;

export interface EngineTypes {
	path: string;
	version: string;
	written: boolean;
}

export interface HookCheck {
	ok: boolean;
	output: string;
}

// The engine writes its declarations only when the plugin-authoring skill loads; `CLAUDE_CODE_TMPDIR` puts them in
// the run folder, and the fake makes the run free.
export const engineTypes = async (out = ENGINE_TYPES): Promise<EngineTypes> => {
	const version = await claudeVersion(launchEnv({}, { config: "" }, process.env));
	const file = Bun.file(out);
	if ((await file.exists()) && HEADER.exec(await file.text())?.[1] === version) {
		return { path: out, version, written: false };
	}
	const run = await createRun({ probe: "engine-types", quiet: true });
	const tmp = join(run.dir, "tmp");
	await mkdir(tmp, { recursive: true });
	const fake = await startFake({ plan: { steps: [], fallback: { blocks: [{ type: "text", text: "Done." }] } }, dir: join(run.dir, "requests") });
	try {
		await launch({ prompt: "/plugin-authoring", mode: "stream-json", model: DEFAULT_MODEL, baseUrl: fake.url, env: { CLAUDE_CODE_TMPDIR: tmp } }, run);
	} finally {
		await fake.stop();
	}
	const [found] = new Bun.Glob(`*/bundled-skills/${version}/*/plugin-authoring/types/claude-code.d.ts`).scanSync(tmp);
	if (found === undefined) {
		throw new Error(`claude-code.d.ts for ${version}: not written under ${tmp}; debug log ${runFiles(run).debug}`);
	}
	await mkdir(dirname(out), { recursive: true });
	await Bun.write(out, Bun.file(join(tmp, found)));
	return { path: out, version, written: true };
};

// Hooks run in the engine, not in Bun, so the check drops `bun-types`. The declarations are `declare module
// 'claude-code'` blocks, so including the file is what resolves the import.
// The project file sits in a temp folder, and a relative include would resolve there and check nothing.
export const checkHooks = async (dirs: string[], types = ENGINE_TYPES): Promise<HookCheck> => {
	const absolute = dirs.map((d) => resolve(d));
	const empty = absolute.filter((d) => new Bun.Glob("**/*.ts").scanSync({ cwd: d, onlyFiles: true }).next().done);
	if (empty.length > 0) {
		throw new Error(`no .ts file under ${empty.join(", ")}`);
	}
	const project = await tempDir("hook-check");
	await Bun.write(
		join(project, "tsconfig.json"),
		JSON.stringify({
			extends: KIT_TSCONFIG,
			compilerOptions: { types: [] },
			include: [...absolute.map((d) => join(d, "**", "*.ts")), resolve(types)],
			exclude: [],
		}),
	);
	const proc = Bun.spawn(["bun", "check", "--no-pretty", "-p", project], { stdout: "pipe", stderr: "pipe" });
	const [stdout, stderr, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
	return { ok: code === 0, output: stdout + stderr };
};
