// Pure code, no model call: the family comes from marker files and the commands from the table.

import {
	type Command,
	FAMILIES,
	type Family,
	type Kind,
} from "./starter-families";

/** A memory file costs about one character per character in every request, so the starter stays short. */
const AGENTS_CAP = 600;

export interface Listing {
	/** Every file git sees, tracked or not and not ignored: the markers are read from it. */
	readonly files: readonly string[];
	/** The files git tracks: a heavy path goes to `.ignore` only when git tracks a file of it. */
	readonly tracked: readonly string[];
}

interface Existing {
	readonly agents: boolean;
	readonly claude: boolean;
}

export interface StarterFile {
	readonly path: string;
	readonly text: string;
}

const AGENTS = "AGENTS.md";
const CLAUDE = "CLAUDE.md";

const KIND_ORDER: readonly Kind[] = ["test", "build", "lint", "types"];

const SENTENCES: Record<Kind, (label: string, run: string) => string> = {
	test: (label, run) => `Run the ${label}tests with \`${run}\`.`,
	build: (label, run) => `Build the ${label}code with \`${run}\`.`,
	lint: (label, run) => `Lint the ${label}code with \`${run}\`.`,
	types: (label, run) => `Check the ${label}types with \`${run}\`.`,
};

export const linesOf = (text: string): string[] =>
	text.split("\n").filter((line) => line.trim() !== "");

export const globOf = (glob: string): string =>
	glob
		.split("*")
		.map((part) => part.replaceAll(/[.+?^${}()|[\]\\]/gu, String.raw`\$&`))
		.join("[^/]*");

/** A root name or `*` glob, an exact path, or a `dir/` prefix. */
const present = (pattern: string, paths: readonly string[]): boolean => {
	if (pattern.endsWith("/")) {
		return paths.some((path) => path.startsWith(pattern));
	}
	if (pattern.includes("/")) {
		return paths.includes(pattern);
	}
	const name = new RegExp(`^${globOf(pattern)}$`, "u");
	return paths.some((path) => !path.includes("/") && name.test(path));
};

export const detectFamilies = (files: readonly string[]): readonly Family[] =>
	FAMILIES.filter((family) =>
		family.markers.some((marker) => present(marker, files)),
	);

const commandOf = (
	family: Family,
	kind: Kind,
	files: readonly string[],
): Command | undefined =>
	family.commands.find(
		(command) =>
			command.kind === kind &&
			(command.when === undefined ||
				command.when.some((name) => present(name, files))),
	);

const familyLines = (
	family: Family,
	files: readonly string[],
	label: string,
): string[] =>
	KIND_ORDER.flatMap((kind) => {
		const command = commandOf(family, kind, files);
		return command === undefined ? [] : [SENTENCES[kind](label, command.run)];
	});

const agentsText = (
	families: readonly Family[],
	files: readonly string[],
): string | undefined => {
	const lines = families.flatMap((family) =>
		familyLines(
			family,
			files,
			families.length > 1 ? `${family.label} ` : "",
		).map((line) => `- ${line}`),
	);
	let text = `# ${AGENTS}\n\n`;
	let kept = 0;
	for (const line of lines) {
		if (text.length + line.length + 1 > AGENTS_CAP) {
			break;
		}
		text += `${line}\n`;
		kept++;
	}
	return kept === 0 ? undefined : text;
};

/** The files to write, none of them a file the repo already holds; empty when the repo has a memory file or no known family. */
export const planStarter = (
	listing: Listing,
	existing: Existing,
): readonly StarterFile[] => {
	if (existing.agents || existing.claude) {
		return [];
	}
	const families = detectFamilies(listing.files);
	const agents = agentsText(families, listing.files);
	if (agents === undefined) {
		return [];
	}
	return [
		{ path: AGENTS, text: agents },
		{ path: CLAUDE, text: `# ${CLAUDE}\n\n@${AGENTS}\n` },
	];
};

const TRAILING_NEWLINE = /\n$/u;

/** Each new file as added lines, so a person sees exactly what a yes writes. */
export const previewOf = (files: readonly StarterFile[]): string =>
	files
		.map((file) =>
			[
				`+++ ${file.path}`,
				...file.text
					.replace(TRAILING_NEWLINE, "")
					.split("\n")
					.map((line) => `+${line}`),
			].join("\n"),
		)
		.join("\n");
