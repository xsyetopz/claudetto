// The OpenSpec finds of `claudetto-setup` and their removal (design D20).
// Each package manager runs from the `PATH` of `env` only, so a test puts a stub of it first on a temp `PATH`.
import fs from "node:fs/promises";
import path from "node:path";
import { fileReader } from "../../../kernel/node/fs.ts";
import type { OpenspecFinds } from "../domain/inventory.ts";
import { t } from "../prompts.ts";
import { byCode } from "./scan.ts";

const PACKAGE = "@fission-ai/openspec";
const GLOBAL_VERSION = /@fission-ai\/openspec@(\S+)/;
const SKILL_NAME = /^openspec-/;
const COMMAND_NAME = /^opsx([-.]|$)/;

/** The arguments that list and remove the global packages of each manager. */
const MANAGERS: Record<string, [list: string, remove: string]> = {
	bun: ["pm ls -g", "remove -g"],
	npm: ["ls -g --depth=0", "uninstall -g"],
	pnpm: ["ls -g --depth=0", "remove -g"],
	yarn: ["global list", "global remove"],
};

interface Io {
	log: (line: string) => void;
	error: (line: string) => void;
}

/** Runs `command` from the `PATH` of `env`: its exit code and output, or `null` when the `PATH` has no such command. */
const run = async (env: NodeJS.ProcessEnv, command: string, args: string) => {
	const PATH = env["PATH"] ?? "";
	const bin = globalThis.Bun.which(command, { PATH });
	if (!bin) {
		return null;
	}
	const proc = globalThis.Bun.spawn([bin, ...args.split(" ")], {
		env: { PATH, HOME: env["HOME"] ?? "" },
		stdout: "pipe",
		stderr: "pipe",
	});
	const [out, code] = await Promise.all([
		new Response(proc.stdout).text(),
		proc.exited,
	]);
	return { code, out };
};

const removeArgs = (manager: string) => `${MANAGERS[manager]?.[1]} ${PACKAGE}`;
const commandOf = (manager: string) => `${manager} ${removeArgs(manager)}`;

/** The `package.json` files of `projectDir` that list the OpenSpec package. */
const listedIn = async (projectDir: string): Promise<string[]> => {
	const file = path.join(projectDir, "package.json");
	try {
		const pkg = JSON.parse((await fileReader.read(file)) ?? "{}");
		const lists = [pkg.dependencies, pkg.devDependencies];
		return lists.some((l) => l && Object.hasOwn(l, PACKAGE)) ? [file] : [];
	} catch {
		return [];
	}
};

/** Each OpenSpec install in the global packages, on the `PATH` of `env`, and in the skills and commands of `configDir` and `projectDir`. */
export const findOpenspec = async (
	env: NodeJS.ProcessEnv,
	configDir: string,
	projectDir: string,
): Promise<OpenspecFinds> => {
	const global: OpenspecFinds["global"] = [];
	const versions = await Promise.all(
		Object.entries(MANAGERS).map(
			async ([manager, [list]]) =>
				GLOBAL_VERSION.exec(
					(await run(env, manager, list ?? ""))?.out ?? "",
				)?.[1],
		),
	);
	for (const [index, manager] of Object.keys(MANAGERS).entries()) {
		const version = versions[index];
		if (version) {
			global.push({ manager, version });
		}
	}
	const homes = [configDir, path.join(projectDir, ".claude")];
	const each = async (folder: string, test: RegExp) =>
		(
			await Promise.all(
				homes.map(async (h) =>
					(
						await fileReader.list(path.join(h, folder))
					)
						.filter((name) => test.test(name))
						.sort(byCode)
						.map((name) => path.join(h, folder, name)),
				),
			)
		).flat();
	return {
		global,
		path: globalThis.Bun.which("openspec", { PATH: env["PATH"] ?? "" }),
		skills: await each("skills", SKILL_NAME),
		commands: await each("commands", COMMAND_NAME),
		devDependency: await listedIn(projectDir),
	};
};

/** Removes the global package with each of `managers` one after the other, and gives 1 when a removal fails, else 0. */
const removeGlobal = async (
	io: Io,
	env: NodeJS.ProcessEnv,
	managers: string[],
): Promise<number> => {
	const [manager, ...rest] = managers;
	if (manager === undefined) {
		return 0;
	}
	const failed = (await run(env, manager, removeArgs(manager)))?.code !== 0;
	if (failed) {
		io.error(t("openspecFailed", { command: commandOf(manager) }));
	}
	return Math.max(Number(failed), await removeGlobal(io, env, rest));
};

/** Prints the OpenSpec installs, and with `apply` removes each with the tool that owns it, then checks that `openspec` is not on the `PATH`. The dev dependency stays. The exit status is 1 when a removal fails or `openspec` stays on the `PATH`. */
export const openspecRun = async (
	io: Io,
	env: NodeJS.ProcessEnv,
	apply: boolean,
	configDir: string,
	projectDir: string,
): Promise<number> => {
	const finds = await findOpenspec(env, configDir, projectDir);
	const files = [...finds.skills, ...finds.commands];
	for (const { manager, version } of finds.global) {
		io.log(
			t("openspecGlobal", { manager, version, command: commandOf(manager) }),
		);
	}
	if (finds.path) {
		io.log(t("openspecPath", { file: finds.path }));
	}
	for (const file of files) {
		io.log(t("openspecFile", { file }));
	}
	for (const file of finds.devDependency) {
		io.log(t("openspecDev", { file }));
	}
	if (!apply) {
		io.log(`\n${t("dryRun")}`);
		return 0;
	}
	const failed = await removeGlobal(
		io,
		env,
		finds.global.map(({ manager }) => manager),
	);
	await Promise.all(
		files.map((file) => fs.rm(file, { recursive: true, force: true })),
	);
	const left = globalThis.Bun.which("openspec", { PATH: env["PATH"] ?? "" });
	if (left) {
		io.error(t("openspecStill", { file: left }));
	}
	return left ? 1 : failed;
};
