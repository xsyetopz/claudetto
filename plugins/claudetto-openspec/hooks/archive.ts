import { type Fs, join } from "./fs.ts";
import { validateSpec } from "./spec-rules.ts";
import {
	type Block,
	fenceMask,
	fold,
	leftovers,
	merge,
	parsePlan,
	section,
} from "./spec.ts";
import { scanTasks } from "./tasks.ts";
import {
	baseBlocks,
	changeDir,
	discoverDeltas,
	linkEscapes,
	metadata,
	nestedChanges,
	NO_DELTA,
	validateChange,
} from "./validate.ts";

export type Run = (
	argv: string[],
) => Promise<{ exitCode: number; stderr: string }>;

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

// A name that already starts with YYYY-MM-DD- keeps it (no stutter).
const DATED = /^\d{4}-\d{2}-\d{2}-/;
const REQUIREMENTS_H2 = /^##\s/;
const REQUIREMENT_H3 = /^###\s*Requirement:/i;
const TRAILING_NEWLINES = /\n*$/;

export const replaceRequirements = (md: string, list: Block[]) => {
	const body = list.map((b) => b.raw).join("\n\n");
	if (section(md, "Requirements") === undefined) {
		return `${md.trimEnd()}\n\n## Requirements\n\n${body}\n`;
	}
	const lines = md.split("\n");
	const start = lines.findIndex((l) => l.trim() === "## Requirements");
	const mask = fenceMask(lines);
	const after = (re: RegExp) =>
		lines.findIndex((l, i) => i > start && !mask[i] && re.test(l));
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

const refuse = (code: ArchiveBlocked["code"], message: string) =>
	new ArchiveBlocked(code, message);

// A new capability takes the Purpose its delta carries (#1413), unless that text would hide or
// split the spec: a comment, a heading, an open fence, or nothing but a code sample.
// Comments are blanked to NULs, newlines kept, so a commented-out header is not found and a Purpose
// that holds a comment shows it.
const COMMENT = /<!--[\s\S]*?(?:--!?>|$)/g;
const maskComments = (md: string) =>
	md.replace(COMMENT, (c) => c.replace(/[^\n]/g, "\0"));

const HEADING_LINE = /^#{1,6}\s/m;
const FENCE_OPEN = /^ {0,3}(```|~~~)/gm;
const FENCED = /^ {0,3}(```|~~~)[\s\S]*?^ {0,3}\1.*$/gm;
const carriedPurpose = (text?: string) => {
	const fences = text?.match(FENCE_OPEN)?.length ?? 0;
	const prose = text?.replace(FENCED, "");
	return !text ||
		text.includes("\0") ||
		fences % 2 === 1 ||
		HEADING_LINE.test(prose ?? "") ||
		!prose?.trim()
		? undefined
		: text;
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

// Deletes each retired spec and prunes the capability directories it empties, up to the specs root.
const retireSpecs = async (run: Run, specs: string, ids: string[]) => {
	for (const id of ids) {
		await run(["rm", "-f", join(specs, id, "spec.md")]);
		const parts = id.split("/");
		for (let n = parts.length; n > 0; n--) {
			const gone = await run(["rmdir", join(specs, ...parts.slice(0, n))]);
			if (gone.exitCode !== 0) {
				break;
			}
		}
	}
};

// Validates, refuses open tasks, merges every delta in memory, and only then touches the tree:
// `mv` first (it fails alone), then the merged specs. Returns the archive path.
export const archive = async (
	fs: Fs,
	run: Run,
	root: string,
	name: string,
	date: string,
) => {
	const nested = await nestedChanges(fs, changeDir(root, name), name);
	if (nested.length > 0) {
		throw refuse(
			"not_a_change",
			`"${name}" is not a change: it is a folder wrapping ${nested.map((n) => `openspec/changes/${n}/`).join(", ")}. A change must be a directory directly under openspec/changes/. Rename each nested change to a flat name (for example "${nested[0]?.replaceAll("/", "-")}").`,
		);
	}
	const verdict = await validateChange(fs, root, name, true);
	// A change with no spec deltas is a plain move; validate still reports it.
	const errors = verdict.issues.filter(
		(i) => i.level !== "INFO" && i.message !== NO_DELTA,
	);
	if (errors.length > 0) {
		throw refuse(
			"invalid_delta",
			errors.map((i) => `${i.path}: ${i.message}`).join("; "),
		);
	}
	const source = changeDir(root, name);
	const tasks = join(source, "tasks.md");
	const open = (await fs.exists(tasks))
		? scanTasks(await fs.read(tasks)).open
		: [];
	if (open.length > 0) {
		throw refuse(
			"open_tasks",
			`tasks.md has ${open.length} unticked: ${open.map((t) => `line ${t.line} ${t.text}`).join("; ")}`,
		);
	}
	const archives = join(root, "openspec", "changes", "archive");
	// Upstream's `openspec archive` holds this claim while it creates an archive; this tool never writes it.
	if (await fs.exists(join(archives, ".openspec-archive.lock"))) {
		throw refuse(
			"archive_locked",
			"An archive is being created, or its claim .openspec-archive.lock is stale: remove it if no archive process runs.",
		);
	}
	const dest = join(archives, DATED.test(name) ? name : `${date}-${name}`);
	if (await fs.exists(dest)) {
		throw refuse(
			"archive_target_exists",
			`Archive '${dest.split("/").pop()}' already exists.`,
		);
	}
	const { found } = await discoverDeltas(fs, join(source, "specs"));
	const specs = join(root, "openspec", "specs");
	const escapes = await Promise.all(
		found.map((d) => linkEscapes(fs, specs, d.id)),
	);
	const escaping = found.find((_, i) => escapes[i]);
	if (escaping) {
		throw refuse(
			"link_escapes",
			`The main spec for ${escaping.id} is a link that leaves openspec/specs.`,
		);
	}
	const { retire } = await metadata(fs, source);
	const writes = await Promise.all(
		found.map(async (d) => ({
			id: d.id,
			text: await mergeSpec(fs, specs, name, d.id, d.file, retire),
		})),
	);
	if (!(await fs.exists(archives))) {
		await run(["mkdir", "-p", archives]);
	}
	const moved = await run(["mv", source, dest]);
	if (moved.exitCode !== 0) {
		throw refuse("move_failed", `mv failed: ${moved.stderr.trim()}`);
	}
	await Promise.all(
		writes.map(
			(w) => w.text !== null && fs.write(join(specs, w.id, "spec.md"), w.text),
		),
	);
	await retireSpecs(
		run,
		specs,
		writes.filter((w) => w.text === null).map((w) => w.id),
	);
	return dest;
};
