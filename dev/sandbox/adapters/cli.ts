import { chmod, lstat, mkdtemp, readdir, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { file as bunFile, spawn, which } from "bun";
import { cleanRefusal } from "../domain/clean.ts";
import { report } from "../domain/frontmatter.ts";
import {
	MISSING_PLUGIN_DIR,
	MODEL_NOT_ALLOWED,
	NOTHING_TO_REMOVE,
	REFUSE_SYMLINK,
	USAGE,
} from "../prompts.ts";
import { cleanEnv, loginToken } from "./login.ts";
import { absolutePluginDirs, availableModels, exists, setUp } from "./setup.ts";

/** The name of the scratch folder of `claudetto-sandbox` in the temp folder. */
const SANDBOX_TEMP = "claudetto-sandbox";

// A folder without the write bit keeps its files, so `rm` cannot remove them.
const makeWritable = async (dir: string): Promise<void> => {
	await chmod(dir, (await stat(dir)).mode | 0o700);
	const entries = await readdir(dir, { withFileTypes: true });
	await Promise.all(
		entries
			.filter((entry) => entry.isDirectory())
			.map((entry) => makeWritable(path.join(dir, entry.name))),
	);
};

/** Removes the sandbox folder `root`, and returns the exit code. */
const cleanRoot = async (root: string): Promise<number> => {
	const rootStat = await lstat(root).catch(() => null);
	if (!rootStat) {
		process.stdout.write(`${NOTHING_TO_REMOVE({ root })}\n`);
		return 0;
	}
	// A symlink would make `makeWritable` act on the folder it points to.
	if (rootStat.isSymbolicLink()) {
		console.error(REFUSE_SYMLINK({ root }));
		return 1;
	}
	const isDefault = root === path.resolve(os.tmpdir(), SANDBOX_TEMP);
	const refusal = cleanRefusal(root, await readdir(root), isDefault);
	if (refusal) {
		console.error(refusal);
		return 1;
	}
	await makeWritable(root);
	await rm(root, { recursive: true, force: true });
	process.stdout.write(`Removed ${root}\n`);
	return 0;
};

/** The env of the child: the login token is read with the real HOME, and only the child gets the sandbox HOME. */
const childEnv = async (
	config: string,
	home: string,
): Promise<NodeJS.ProcessEnv> => {
	const env: NodeJS.ProcessEnv = {
		...(await cleanEnv()),
		CLAUDE_CONFIG_DIR: config,
		HOME: home,
	};
	delete env["ZDOTDIR"];
	delete env["XDG_CONFIG_HOME"];
	// The token is not written to disk or printed.
	const token = await loginToken();
	if (token) {
		env["CLAUDE_CODE_OAUTH_TOKEN"] = token;
	} else {
		console.error("No login token found. Run /login inside the sandbox.");
	}
	return env;
};

/** The count of `--plugin-dir` folders of `rest`, or null (after it prints why) when one holds no plugin manifest. */
const checkPluginDirs = async (rest: string[]): Promise<number | null> => {
	const dirs = rest.flatMap((a, i) => {
		if (rest[i - 1] === "--plugin-dir") {
			return [a];
		}
		return a.startsWith("--plugin-dir=") ? [a.slice(13)] : [];
	});
	const found = await Promise.all(
		dirs.map((dir) => exists(path.join(dir, ".claude-plugin", "plugin.json"))),
	);
	const missing = dirs.filter((_, i) => !found[i]);
	for (const dir of missing) {
		console.error(MISSING_PLUGIN_DIR({ dir }));
	}
	return missing.length > 0 ? null : dirs.length;
};

// Claude Code gives no error for a `--model` that `availableModels` leaves out, so the run would serve another model than the arm. Returns true when it would.
const modelDiffers = async (
	rest: string[],
	config: string,
): Promise<boolean> => {
	const model = rest.includes("--model")
		? rest[rest.indexOf("--model") + 1]
		: "";
	const allowed = model ? await availableModels(config) : undefined;
	if (
		Array.isArray(allowed) &&
		model?.startsWith("claude-") &&
		!allowed.includes(model)
	) {
		console.error(MODEL_NOT_ALLOWED({ model, allowed: allowed.join(", ") }));
		return true;
	}
	return false;
};

/** The exit code of a `--check-frontmatter` session, from its exit and its debug log. */
const frontmatterResult = async (
	exitCode: number,
	log: string | null,
	plugins: number,
): Promise<number> => {
	if (exitCode !== 0) {
		console.error(`The sandbox session failed with exit ${exitCode}.`);
		return 1;
	}
	if (!log || !(await exists(log))) {
		console.error(`The session wrote no debug log at ${log}.`);
		return 1;
	}
	const { lines, code } = report(log, await bunFile(log).text(), plugins);
	for (const l of lines) {
		process.stdout.write(`${l}\n`);
	}
	return code;
};

/** The arguments of a `--check-frontmatter` session, and its debug log: one headless session that writes the log. */
const frontmatterRun = async (
	rest: string[],
): Promise<{ rest: string[]; log: string }> => {
	const log = path.join(
		await mkdtemp(
			path.join(process.env["TMPDIR"] || os.tmpdir(), "sandbox-frontmatter-"),
		),
		"debug.txt",
	);
	return {
		rest: [
			...rest.filter((a) => a !== "--check-frontmatter"),
			"--debug-file",
			log,
			"-p",
			"Reply with OK.",
		],
		log,
	};
};

export const main = async (argv: string[]): Promise<number> => {
	const args = [...argv];
	const dirAt = args.indexOf("--dir");
	const next = args[dirAt + 1];
	let dir = path.join(os.tmpdir(), SANDBOX_TEMP);
	if (dirAt !== -1) {
		if (!next || next.startsWith("--")) {
			console.error("--dir needs a directory, not a flag.");
			return 1;
		}
		dir = next;
		args.splice(dirAt, 2);
	}
	const root = path.resolve(dir);
	const config = path.join(root, "config");
	const project = path.join(root, "project");
	const home = path.join(root, "home");

	if (args[0] === "--help" || args[0] === "-h") {
		process.stdout.write(`${USAGE}\n`);
		return 0;
	}
	if (args[0] === "--clean") {
		return cleanRoot(root);
	}

	let rest = absolutePluginDirs(args);
	const plugins = await checkPluginDirs(rest);
	if (plugins === null) {
		return 1;
	}

	const check = rest.includes("--check-frontmatter");
	let log: string | null = null;
	if (check) {
		({ rest, log } = await frontmatterRun(rest));
	}

	await setUp({ root, config, home, project });
	const claude = which("claude");
	if (!claude) {
		console.error("claude is not on PATH. Put the claude executable on PATH.");
		return 1;
	}
	const env = await childEnv(config, home);
	if (await modelDiffers(rest, config)) {
		return 1;
	}
	// Managed settings can lock a plugin name, and then Claude Code ignores its `--plugin-dir` copy.
	const exitCode = await spawn([claude, ...rest], {
		cwd: project,
		env,
		stdio: ["inherit", "inherit", "inherit"],
	}).exited;
	if (!check) {
		return exitCode ?? 1;
	}
	return frontmatterResult(exitCode ?? 1, log, plugins);
};
