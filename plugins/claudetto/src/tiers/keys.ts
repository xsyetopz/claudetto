import { refusedNames } from "../refused.ts";
import type { TierSnippet } from "./snippet.ts";

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const ENV_PREFIX = /^env\./;

export const settingsKeyNames = (snippet: TierSnippet): readonly string[] =>
	Object.keys(snippet).filter((key) => key !== "env");

export const envKeyNames = (snippet: TierSnippet): readonly string[] => {
	const env = snippet["env"];
	return isRecord(env) ? Object.keys(env) : [];
};

export const denyRulesOf = (snippet: TierSnippet): readonly string[] => {
	const permissions = snippet["permissions"];
	const deny = isRecord(permissions) ? permissions["deny"] : undefined;
	return Array.isArray(deny)
		? deny.filter((rule) => typeof rule === "string")
		: [];
};

export const refusedPaths = (snippet: TierSnippet): readonly string[] =>
	[
		...Object.keys(snippet),
		...envKeyNames(snippet).map((name) => `env.${name}`),
	].filter((path) => refusedNames().includes(path.replace(ENV_PREFIX, "")));
