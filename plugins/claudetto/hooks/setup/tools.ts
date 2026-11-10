import { SCANNER, SCANNER_INSTALL } from "../secrets.ts";

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
	why: "claudetto leaves cache and build-folder cleanup to Mole",
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
const FULL_PERCENT = 80;

/** The line for `df -Pk` output once the volume is over 80% full, or nothing. */
export const diskLine = (df: string): string | undefined => {
	const [, , , available, capacity] = (df.trim().split("\n")[1] ?? "").split(
		/\s+/,
	);
	const percent = Number.parseInt(capacity ?? "", 10);
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
	return (await Promise.all(folders.map((f) => exists(`${f}/${name}`)))).some(
		Boolean,
	);
};

export const noticeLine = (tool: Tool, hasBrew: boolean): string =>
	`\`${tool.name}\` is not on your \`PATH\`, and ${tool.why}. ${
		hasBrew
			? `Install: \`${tool.install.join(" ")}\`.`
			: `Releases are at ${tool.releases}.`
	} \`/claudetto:setup\` can do it.`;

const parts = (release: string): readonly number[] =>
	(release.split("-")[0] ?? "").split(".").map(Number);

export const isBelowFloor = (release: string, floor: string): boolean => {
	const [running, wanted] = [parts(release), parts(floor)];
	const differs = wanted.findIndex((part, index) => part !== running[index]);
	return differs !== -1 && (running[differs] ?? 0) < (wanted[differs] ?? 0);
};
