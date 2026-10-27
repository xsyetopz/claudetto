import os from "node:os";
import path from "node:path";
import { file as bunFile, spawn, which } from "bun";

export const parseJson = <T = unknown>(text: string): T | null => {
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
};

export const readJson = async <T = unknown>(file: string): Promise<T | null> =>
	parseJson<T>(
		await bunFile(file)
			.text()
			.catch(() => ""),
	);

interface Credentials {
	claudeAiOauth?: { accessToken?: string };
}

export const loginToken = async (): Promise<string | null> => {
	if (process.env["CLAUDE_CODE_OAUTH_TOKEN"]) {
		return process.env["CLAUDE_CODE_OAUTH_TOKEN"];
	}
	const keychain =
		process.platform === "darwin" && which("security")
			? spawn([
					"security",
					"find-generic-password",
					"-s",
					"Claude Code-credentials",
					"-w",
				])
			: null;
	const keychainText =
		keychain && (await keychain.exited) === 0
			? await new Response(keychain.stdout).text()
			: "";
	const creds =
		keychainText.length > 0
			? parseJson<Credentials>(keychainText)
			: await readJson<Credentials>(
					path.join(os.homedir(), ".claude", ".credentials.json"),
				);
	return creds?.claudeAiOauth?.accessToken || null;
};

// These variables of the parent session would join the parent session or fake its state in the sandbox.
const SESSION_VARS = new Set([
	"CLAUDECODE",
	"AI_AGENT",
	"CLAUDE_PID",
	"CLAUDE_EFFORT",
	"CLAUDE_PROJECT_DIR",
	"CLAUDE_ENV_FILE",
	"CLAUDE_CODE_CHILD_SESSION",
	"CLAUDE_CODE_ENTRYPOINT",
	"CLAUDE_CODE_EXECPATH",
	"CLAUDE_CODE_SSE_PORT",
]);
const SESSION_PREFIXES = [
	"CLAUDE_CODE_SESSION_",
	"CLAUDE_CODE_MESSAGING_",
	"CLAUDE_PLUGIN_",
];

export const cleanEnv = async (): Promise<NodeJS.ProcessEnv> => {
	const own = path.join(
		process.env["CLAUDE_CONFIG_DIR"] || path.join(os.homedir(), ".claude"),
		"settings.json",
	);
	const settingsEnv: Record<string, unknown> =
		(await readJson<{ env?: Record<string, unknown> }>(own))?.env ?? {};
	const env = { ...process.env };
	for (const name of Object.keys(env)) {
		if (
			SESSION_VARS.has(name) ||
			SESSION_PREFIXES.some((p) => name.startsWith(p)) ||
			(Object.hasOwn(settingsEnv, name) &&
				String(settingsEnv[name]) === env[name])
		) {
			delete env[name];
		}
	}
	return env;
};
