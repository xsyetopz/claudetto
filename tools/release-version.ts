// 18.32: the release takes the version of the Claude Code release it is made for, `X.Y.Z` or `X.Y.Z+N`.
// `just release-version` reads the upstream tags with `gh` and this repo's with `git`, and refuses a version that does not follow them.
import { $, file, semver } from "bun";

const ROOT = `${import.meta.dir}/..`;
// The plugin manifests carry no version: Claude Code then versions each install by its commit, so every commit on `main` updates it.
const MANIFESTS = ["package.json", ".claude-plugin/marketplace.json"];
const VERSION = /^(\d+\.\d+\.\d+)(?:\+(\d+))?$/;

const TAG = /^v(\d+\.\d+\.\d+)$/;

function latestBase(tags: string[]): string | undefined {
	return tags
		.map((tag) => TAG.exec(tag)?.[1])
		.filter((base) => base !== undefined)
		.sort(semver.order)
		.at(-1);
}

/** Throws a plain error when `version` may not be released; returns when it may. */
export function checkRelease(
	manifestVersions: string[],
	upstreamTags: string[],
	repoTags: string[],
): void {
	const version = manifestVersions[0];
	if (version === undefined || manifestVersions.some((v) => v !== version)) {
		throw new Error(
			`The manifests disagree on the version: ${[...new Set(manifestVersions)].join(", ")}. Give them one.`,
		);
	}
	const match = VERSION.exec(version);
	if (!match?.[1]) {
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
		.map((tag) => new RegExp(`^v${escaped}(?:\\+(\\d+))?$`).exec(tag))
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
}

async function lines(command: Promise<{ text(): string }>): Promise<string[]> {
	return (await command).text().split("\n").filter(Boolean);
}

if (import.meta.main) {
	const manifestVersions = await Promise.all(
		MANIFESTS.map(async (path) => {
			const json = await file(`${ROOT}/${path}`).json();
			return json.version ?? json.metadata.version;
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
			`release-version: ${error instanceof Error ? error.message : error}\n`,
		);
		process.exitCode = 1;
	}
	if (!process.exitCode) {
		process.stdout.write(
			`release-version: ${manifestVersions[0]} may be released.\n`,
		);
	}
}
