import { access } from "node:fs/promises";
import { join } from "node:path";
import { spawn, which } from "bun";

export const OPENSPEC_INIT = [
	"openspec",
	"init",
	"--tools",
	"claude",
	"--profile",
	"core",
] as const;

const shownInit = `\`${OPENSPEC_INIT.join(" ")}\``;

const exists = async (path: string): Promise<boolean> => {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
};

export const initOpenSpec = async (
	cwd: string,
	dryRun: boolean,
): Promise<{ readonly report: string; readonly failed: boolean }> => {
	const cli = which(OPENSPEC_INIT[0], { cwd });
	if (cli === null) {
		return {
			failed: false,
			report: `Skipped ${shownInit}: \`openspec\` is not on PATH. Install it with \`bun add -g @fission-ai/openspec\`, then run setup again.`,
		};
	}
	if (await exists(join(cwd, "openspec"))) {
		return {
			failed: false,
			report: `Skipped ${shownInit}: \`openspec/\` exists.`,
		};
	}
	if (dryRun) {
		return { failed: false, report: `Would run ${shownInit} in ${cwd}.` };
	}
	const child = spawn([cli, ...OPENSPEC_INIT.slice(1)], {
		cwd,
		env: { ...process.env, OPENSPEC_TELEMETRY: "0" },
		stdin: "ignore",
		stdout: "inherit",
		stderr: "inherit",
	});
	const code = await child.exited;
	return code === 0
		? { failed: false, report: `Ran ${shownInit} in ${cwd}.` }
		: { failed: true, report: `${shownInit} exited ${code} in ${cwd}.` };
};
