// The main spec as archive leaves it, and the refusal archive raises when it cannot.
import { type Fs, join } from "./fs.ts";
import { leftovers } from "./spec-audit.ts";
import { type Block, fenceMask, fold, masked } from "./spec-lines.ts";
import { merge } from "./spec-merge.ts";
import { parsePlan } from "./spec-plan.ts";
import { validateSpec } from "./spec-rules.ts";
import { section } from "./spec.ts";
import { baseBlocks } from "./validate-discover.ts";

export class ArchiveBlocked extends Error {
	readonly code:
		| "archive_target_exists"
		| "archive_locked"
		| "not_a_change"
		| "invalid_delta"
		| "open_tasks"
		| "link_escapes"
		| "move_failed";
	constructor(code: ArchiveBlocked["code"], message: string) {
		super(message);
		this.code = code;
	}
}

export const refuse = (code: ArchiveBlocked["code"], message: string) =>
	new ArchiveBlocked(code, message);

const REQUIREMENTS_H2 = /^##\s/u;
const REQUIREMENT_H3 = /^###\s*Requirement:/iu;
const TRAILING_NEWLINES = /\n*$/u;

export const replaceRequirements = (md: string, list: Block[]) => {
	const body = list.map((b) => b.raw).join("\n\n");
	if (section(md, "Requirements") === undefined) {
		return `${md.trimEnd()}\n\n## Requirements\n\n${body}\n`;
	}
	const lines = md.split("\n");
	const start = lines.findIndex((l) => l.trim() === "## Requirements");
	const mask = fenceMask(lines);
	const after = (re: RegExp) =>
		lines.findIndex((l, i) => i > start && !masked(mask, i) && re.test(l));
	const end = after(REQUIREMENTS_H2);
	const first = after(REQUIREMENT_H3);
	// What stands between the header and the first requirement stays.
	const stop = Math.min(...[first, end].filter((n) => n >= 0), lines.length);
	const preamble = lines
		.slice(start + 1, stop)
		.join("\n")
		.trim();
	const tail = end < 0 ? [] : ["", ...lines.slice(end)];
	return [
		...lines.slice(0, start + 1),
		"",
		...(preamble ? [preamble, ""] : []),
		body,
		...tail,
	]
		.join("\n")
		.replace(TRAILING_NEWLINES, "\n");
};

// A new capability takes the Purpose its delta carries, unless that text would hide or
// split the spec: a comment, a heading, an open fence, or nothing but a code sample.
// Comments are blanked to NULs, newlines kept, so a commented-out header is not found and a Purpose
// that holds a comment shows it.
const COMMENT = /<!--[\s\S]*?(?:--!?>|$)/gu;
const maskComments = (md: string) =>
	md.replaceAll(COMMENT, (c) => c.replaceAll(/[^\n]/gu, "\0"));

const HEADING_LINE = /^#{1,6}\s/mu;
const FENCE_OPEN = /^ {0,3}(```|~~~)/gmu;
const FENCED = /^ {0,3}(```|~~~)[\s\S]*?^ {0,3}\1.*$/gmu;
const carriedPurpose = (text?: string) => {
	const prose = (text ?? "").replaceAll(FENCED, "");
	const fences = text?.match(FENCE_OPEN)?.length ?? 0;
	const unusable =
		text === undefined ||
		text === "" ||
		text.includes("\0") ||
		fences % 2 === 1 ||
		HEADING_LINE.test(prose) ||
		prose.trim() === "";
	return unusable ? undefined : text;
};

const NO_REQUIREMENTS = "Spec must have at least one requirement";

// The main spec as archive leaves it: the one merge, applied to the base spec (or a new one).
// `null` retires the capability: the change declares `retire_capabilities`, removes the last
// requirement of a spec that holds nothing else, and the spec fails only for having no requirements.
export const mergeSpec = async (
	fs: Fs,
	specs: string,
	name: string,
	id: string,
	file: string,
	retire = false,
): Promise<string | null> => {
	const target = join(specs, id, "spec.md");
	const delta = await fs.read(file);
	const plan = parsePlan(delta);
	const base = await baseBlocks(fs, specs, id);
	const { blocks } = merge(base, plan);
	const purpose =
		carriedPurpose(section(maskComments(delta), "Purpose")) ??
		`TBD - created by archiving change ${name}. Update Purpose after archive.`;
	const old = (await fs.exists(target))
		? await fs.read(target)
		: `# ${id} Specification\n\n## Purpose\n${purpose}\n`;
	const text = replaceRequirements(old, blocks);
	const bad = validateSpec(text, false).issues.filter(
		(i) => i.level === "ERROR",
	);
	const had = base ?? [];
	const emptied =
		blocks.length === 0 &&
		// A spec already gone retires as nothing to write; one with no requirement blocks has nothing to remove.
		(base === undefined || had.length > 0) &&
		// Two copies of one name collapse to one entry in the merge, so one would vanish unread.
		new Set(had.map((b) => fold(b.name))).size === had.length &&
		bad.every((i) => i.message === NO_REQUIREMENTS);
	if (retire && emptied && leftovers(old).length === 0) {
		return null;
	}
	if (bad.length > 0) {
		throw refuse(
			"invalid_delta",
			`${id}: ${bad.map((i) => i.message).join("; ")}${emptied ? ". To retire the capability, set retire_capabilities: true in .openspec.yaml." : ""}`,
		);
	}
	return text;
};
