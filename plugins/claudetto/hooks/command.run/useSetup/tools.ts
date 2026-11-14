import type { EngineInterface } from "claude-code";

import { SCANNER, SCANNER_INSTALL } from "../../secrets";
import { type Advice, ask, dismissed, type Question } from "./engine";

export interface Tool {
	readonly name: string;
	readonly install: readonly string[];
	readonly releases: string;
	/** A required tool's notice shows at every start until it is installed, and a decline is not recorded. */
	readonly required: boolean;
	readonly why: string;
}

export const MOLE: Tool = {
	name: "mo",
	install: ["brew", "install", "mole"],
	releases: "https://github.com/tw93/Mole/releases",
	required: true,
	why: "claudetto runs Mole to clear caches at each session start",
};

export const TOOLS: readonly Tool[] = [
	{
		name: "ast-grep",
		install: ["brew", "install", "ast-grep"],
		releases: "https://github.com/ast-grep/ast-grep/releases",
		required: false,
		why: "it gives a precise structural search",
	},
	{
		name: SCANNER,
		install: SCANNER_INSTALL,
		releases: "https://github.com/betterleaks/betterleaks/releases",
		required: true,
		why: "without it every tool result is withheld, because claudetto cannot check it for secrets",
	},
	MOLE,
];

/** `mo purge` scans only these folders once the file names any, and its defaults miss most project roots. */
export const PURGE_PATHS = ".config/mole/purge_paths";

/** Each folder a `purge_paths` text lists, with a leading `~` read as `home`. */
export const listedPaths = (text: string, home: string): string[] =>
	text
		.split("\n")
		.map((line) => line.trim().replace(/^~(?=\/|$)/u, home))
		.filter((dir) => dir !== "" && !dir.startsWith("#"));
const FULL_PERCENT = 80;

/** The line for `df -Pk` output once the volume is over 80% full, or nothing. */
export const diskLine = (df: string): string | undefined => {
	const columns = (df.trim().split("\n")[1] ?? "").split(/\s+/u);
	const available = columns[3];
	const percent = Math.trunc(Number((columns[4] ?? "").replace("%", "")));
	if (!(percent > FULL_PERCENT)) {
		return undefined;
	}
	const free = (Number(available) / 1024 ** 2).toFixed(1);
	return `The disk holding this project is ${percent}% full, ${free} GiB free. Preview what Mole would remove: \`! mo clean --dry-run\` for caches, \`! mo purge --dry-run\` for build folders.`;
};

export const noticeKey = (tool: Tool): string => `optional-tool:${tool.name}`;

export const isOnPath = async (
	name: string,
	path: string | undefined,
	exists: (file: string) => Promise<boolean>,
): Promise<boolean> => {
	const folders = (path ?? "").split(":").filter((folder) => folder !== "");
	const awaited = await Promise.all(folders.map((f) => exists(`${f}/${name}`)));
	return awaited.some(Boolean);
};

export const noticeLine = (tool: Tool, hasBrew: boolean): string =>
	`\`${tool.name}\` is not on your \`PATH\`, and ${tool.why}. ${
		hasBrew
			? `Install: \`${tool.install.join(" ")}\`.`
			: `Releases are at ${tool.releases}.`
	} \`/claudetto:setup\` can do it.`;

const YES = "Yes";
const NO = "No";
const INSTALL_MS = 600_000;

/** The install offer for a missing tool, its report line when no package manager can install it, or `undefined` when it is installed. */
export async function toolOffer(
	$: EngineInterface,
	tool: Tool,
): Promise<{ question: Question } | { line: string } | undefined> {
	const exists = (file: string) => $.fs.exists(file);
	const path = await $.env.get("PATH");
	if (await isOnPath(tool.name, path, exists)) {
		return undefined;
	}
	if (!(await isOnPath("brew", path, exists))) {
		return {
			line: `\`${tool.name}\` has no package manager here, so nothing was run. Releases are at ${tool.releases}.`,
		};
	}
	return {
		question: {
			text: `\`${tool.name}\` is not installed. Run \`${tool.install.join(" ")}\`?`,
			options: [YES, NO],
		},
	};
}

/** A missing tool: its install command shown and run after a yes. A declined optional tool is recorded, so the launch notice stays quiet. */
export async function toolPart(
	$: EngineInterface,
	tool: Tool,
	advice: Advice,
): Promise<string | undefined> {
	const offer = await toolOffer($, tool);
	if (offer === undefined || "line" in offer) {
		return offer?.line;
	}
	const shown = tool.install.join(" ");
	let answer: string;
	try {
		answer = await ask($, offer.question, advice);
	} catch (error) {
		$.ui.log(`The install question was not answered (${String(error)})`);
		return dismissed("install");
	}
	if (answer.trim() !== YES) {
		if (tool.required) {
			return `Did not install \`${tool.name}\`: ${tool.why}. Run \`${shown}\` to fix it.`;
		}
		await $.store.set(noticeKey(tool), true);
		return `Did not install \`${tool.name}\`. The launch notice stays quiet.`;
	}
	try {
		const result = await $.process.run(tool.install, { timeoutMs: INSTALL_MS });
		return result.exitCode === 0
			? `Ran \`${shown}\`.`
			: `\`${shown}\` failed with exit code ${result.exitCode}: ${result.stderr.trim()}`;
	} catch (error) {
		return `Could not run \`${shown}\` (${String(error)}).`;
	}
}
