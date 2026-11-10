// 18.32: the release takes the version of the Claude Code release it is made for, `X.Y.Z` or `X.Y.Z+N`.
// `just release-version` reads the upstream tags with `gh` and this repo's with `git`, and refuses a version that does not follow them.
import { $, file, semver } from "bun";

const ROOT = `${import.meta.dir}/..`;
// The plugin manifests carry no version: Claude Code then versions each install by its commit, so every commit on `main` updates it.
const MANIFESTS = ["package.json", ".claude-plugin/marketplace.json"];
const VERSION = /^(\d+\.\d+\.\d+)(?:\+(\d+))?$/u;

const TAG = /^v(\d+\.\d+\.\d+)$/u;

const latestBase = (tags: string[]): string | undefined => {
	let latest: string | undefined;
	for (const tag of tags) {
		const base = TAG.exec(tag)?.[1];
		if (
			base !== undefined &&
			(latest === undefined || semver.order(base, latest) > 0)
		) {
			latest = base;
		}
	}
	return latest;
};

/** Throws a plain error when `version` may not be released; returns when it may. */
export const checkRelease = (
	manifestVersions: string[],
	upstreamTags: string[],
	repoTags: string[],
): void => {
	const version = manifestVersions[0];
	if (version === undefined || manifestVersions.some((v) => v !== version)) {
		throw new Error(
			`The manifests disagree on the version: ${[...new Set(manifestVersions)].join(", ")}. Give them one.`,
		);
	}
	const match = VERSION.exec(version);
	if (match?.[1] === undefined || match[1] === "") {
		throw new Error(`"${version}" is not X.Y.Z or X.Y.Z+N.`);
	}
	const base = match[1];
	const latest = latestBase(upstreamTags);
	if (latest !== base) {
		throw new Error(
			`The base ${base} is not the latest anthropics/claude-code tag (v${latest}).`,
		);
	}
	const escaped = base.replaceAll(".", String.raw`\.`);
	const last = repoTags
		.map((tag) => new RegExp(`^v${escaped}(?:\\+(\\d+))?$`, "u").exec(tag))
		.filter((m) => m !== null)
		.map((m) => (m[1] === undefined ? 0 : Number(m[1])));
	const expected = last.length === 0 ? 0 : Math.max(...last) + 1;
	const given = match[2] === undefined ? 0 : Number(match[2]);
	if (given !== expected) {
		const want = expected === 0 ? base : `${base}+${expected}`;
		throw new Error(
			`${version} does not follow this repo's tags: the next release on ${base} is ${want}.`,
		);
	}
};

const lines = async (
	command: Promise<{ text: () => string }>,
): Promise<string[]> => {
	const awaited = await command;
	return awaited.text().split("\n").filter(Boolean);
};

const manifestVersion = (json: unknown): string => {
	if (typeof json === "object" && json !== null) {
		if ("version" in json && typeof json.version === "string") {
			return json.version;
		}
		if (
			"metadata" in json &&
			typeof json.metadata === "object" &&
			json.metadata !== null &&
			"version" in json.metadata &&
			typeof json.metadata.version === "string"
		) {
			return json.metadata.version;
		}
	}
	throw new Error("A manifest carries no version.");
};

if (import.meta.main) {
	const manifestVersions = await Promise.all(
		MANIFESTS.map(async (path) => {
			const json: unknown = await file(`${ROOT}/${path}`).json();
			return manifestVersion(json);
		}),
	);
	const upstreamTags = await lines(
		$`gh api repos/anthropics/claude-code/tags --paginate --jq '.[].name'`.quiet(),
	);
	const repoTags = await lines($`git -C ${ROOT} tag -l`.quiet());
	try {
		checkRelease(manifestVersions, upstreamTags, repoTags);
	} catch (error) {
		process.stderr.write(
			`release-version: ${error instanceof Error ? error.message : String(error)}\n`,
		);
		process.exitCode = 1;
	}
	if (process.exitCode === undefined || process.exitCode === 0) {
		process.stdout.write(
			`release-version: ${manifestVersions[0]} may be released.\n`,
		);
	}
}
