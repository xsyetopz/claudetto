export const TOOL = "ast-grep";

/** The version the launch notice was last shown for, so it shows again only after a change. */
export const TOOL_VERSION = "0.51.1";

export const NOTICE_KEY = `optional-tool:${TOOL}`;

export const RELEASES_PAGE = "https://github.com/ast-grep/ast-grep/releases";

export const INSTALL = ["brew", "install", TOOL] as const;

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

export const noticeLine = (hasBrew: boolean): string =>
	`\`${TOOL}\` is not on your \`PATH\`, and it gives a precise structural search. ${
		hasBrew
			? `Install: \`${INSTALL.join(" ")}\`.`
			: `Releases are at ${RELEASES_PAGE}.`
	} \`/claudetto:setup\` can do it.`;

const parts = (release: string): readonly number[] =>
	(release.split("-")[0] ?? "").split(".").map(Number);

export const isBelowFloor = (release: string, floor: string): boolean => {
	const [running, wanted] = [parts(release), parts(floor)];
	const differs = wanted.findIndex((part, index) => part !== running[index]);
	return differs !== -1 && (running[differs] ?? 0) < (wanted[differs] ?? 0);
};
