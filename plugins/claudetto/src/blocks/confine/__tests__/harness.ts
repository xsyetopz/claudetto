import { mkdir, mkdtemp, stat, symlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { file } from "bun";
import { spawnCommand } from "../../../../../../claudekit/session/command.ts";

export const SCRIPT = join(
	import.meta.dir,
	"..",
	"..",
	"..",
	"..",
	"bin",
	"claudetto-confine",
);

export const exists = async (path: string): Promise<boolean> => {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
};

/** A scratch folder in the home folder, because the temp folders are writable by design and prove nothing about a block. */
export const makeScratch = async () => {
	const scratch = await mkdtemp(join(homedir(), ".confine-spec-"));
	const project = join(scratch, "project");
	const fakeHome = join(scratch, "home");
	await mkdir(project, { recursive: true });
	await mkdir(fakeHome, { recursive: true });
	const run = async (
		command: string,
		env: Record<string, string> = {},
		cwd = project,
	) => {
		const done = await spawnCommand([SCRIPT, command], {
			cwd,
			env: {
				HOME: fakeHome,
				CLAUDETTO_CONFINE_ROOT: project,
				SHELL: "/bin/bash",
				...env,
			},
		});
		return { code: done.code, out: `${done.stdout}${done.stderr}` };
	};
	return { scratch, project, fakeHome, run };
};

const realTool = async (name: string): Promise<string | undefined> => {
	const found = await Promise.all(
		["/usr/bin", "/bin"].map(async (dir) =>
			(await file(join(dir, name)).exists()) ? join(dir, name) : undefined,
		),
	);
	return found.find((path) => path !== undefined);
};

/** A folder of stubs that stands for `PATH`: `uname` says `system`, each entry of `tools` is a script, and the few tools the script needs are links to the real ones. */
export const stubPath = async (
	system: string,
	tools: Record<string, string> = {},
) => {
	const stubs = await mkdtemp(join(homedir(), ".confine-stubs-"));
	await writeFile(join(stubs, "uname"), `#!/bin/sh\necho ${system}\n`, {
		mode: 0o755,
	});
	await Promise.all(
		Object.entries(tools).map(([name, body]) =>
			writeFile(join(stubs, name), body, { mode: 0o755 }),
		),
	);
	await Promise.all(
		["dirname", "mkdir", "touch"]
			.filter((name) => tools[name] === undefined)
			.map(async (name) => {
				const real = await realTool(name);
				if (real !== undefined) {
					await symlink(real, join(stubs, name));
				}
			}),
	);
	return stubs;
};
