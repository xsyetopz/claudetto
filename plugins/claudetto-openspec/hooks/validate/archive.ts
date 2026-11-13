import { type Fs, join } from "../fs";
import { scanTasks } from "../tasks";
import { mergeSpec, refuse } from "./archive-merge";
import { changeDir, NO_DELTA, validateChange } from "./validate";
import { discoverDeltas, linkEscapes } from "./validate-discover";
import { metadata } from "./validate-meta";
import { nestedChanges } from "./validate-nested";

export type Run = (
	argv: string[],
) => Promise<{ exitCode: number; stderr: string }>;

// A name that already starts with YYYY-MM-DD- keeps it (no stutter).
const DATED = /^\d{4}-\d{2}-\d{2}-/u;

// Deletes each retired spec and prunes the capability directories it empties, up to the specs root.
const pruneDirs = async (
	run: Run,
	specs: string,
	parts: string[],
	n: number,
): Promise<void> => {
	if (n === 0) {
		return;
	}
	const gone = await run(["rmdir", join(specs, ...parts.slice(0, n))]);
	if (gone.exitCode === 0) {
		await pruneDirs(run, specs, parts, n - 1);
	}
};

const retireOne = async (run: Run, specs: string, id: string) => {
	await run(["rm", "-f", join(specs, id, "spec.md")]);
	const parts = id.split("/");
	await pruneDirs(run, specs, parts, parts.length);
};

// One id after the other: they may share a parent directory that only the last one empties.
const retireSpecs = async (
	run: Run,
	specs: string,
	ids: string[],
): Promise<void> => {
	const [first, ...rest] = ids;
	if (first !== undefined) {
		await retireOne(run, specs, first);
		await retireSpecs(run, specs, rest);
	}
};

// Refuses a change that is nested, invalid, or has open tasks.
const checkReady = async (fs: Fs, root: string, name: string) => {
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
};

// The archive folder and the destination of this change; refuses a claimed archive or an existing destination.
const claimDest = async (fs: Fs, root: string, name: string, date: string) => {
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
	return { archives, dest };
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
	await checkReady(fs, root, name);
	const { archives, dest } = await claimDest(fs, root, name, date);
	const source = changeDir(root, name);
	const { found } = await discoverDeltas(fs, join(source, "specs"));
	const specs = join(root, "openspec", "specs");
	const escapes = await Promise.all(
		found.map((d) => linkEscapes(fs, specs, d.id)),
	);
	const escaping = found.find((_, i) => escapes[i] === true);
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
		writes.flatMap((w) =>
			w.text === null ? [] : [fs.write(join(specs, w.id, "spec.md"), w.text)],
		),
	);
	await retireSpecs(
		run,
		specs,
		writes.filter((w) => w.text === null).map((w) => w.id),
	);
	return dest;
};
