import { SCANNER, SCANNER_INSTALL, SCANNER_VERSION } from "../secrets.ts";

export interface Tool {
	readonly name: string;
	/** For an optional tool, the version a decline was recorded for, so its notice shows again only after a change. */
	readonly version: string;
	readonly install: readonly string[];
	readonly releases: string;
	/** A required tool's notice shows at every start until it is installed, and a decline is not recorded. */
	readonly required: boolean;
	readonly why: string;
}

export const TOOLS: readonly Tool[] = [
	{
		name: "ast-grep",
		version: "0.51.1",
		install: ["brew", "install", "ast-grep"],
		releases: "https://github.com/ast-grep/ast-grep/releases",
		required: false,
		why: "it gives a precise structural search",
	},
	{
		name: SCANNER,
		version: SCANNER_VERSION,
		install: SCANNER_INSTALL,
		releases: "https://github.com/betterleaks/betterleaks/releases",
		required: true,
		why: "without it every tool result is withheld, because claudetto cannot check it for secrets",
	},
];

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
