import { mkdir, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const RECORD = "run.json";
const DAY_MS = 86_400_000;
const PROBE_NAME = /^[a-z0-9][a-z0-9._-]*$/;

export interface Run {
	id: string;
	dir: string;
	probe: string;
}

export interface RunRecord {
	probe: string;
	runId: string;
	arm?: string;
	case?: string;
	argv: string[];
	envNames: string[];
	claudeVersion: string;
	pluginTreeHashes: Record<string, string>;
	model: string;
	settings: unknown;
	startedAt: string;
	endedAt?: string;
	pid?: number;
	exitCode?: number | null;
	timedOut?: boolean;
	// The seeded transcript of a launch with a prefix, removed when the run ends.
	seed?: string;
}

export interface RunSummary {
	dir: string;
	id: string;
	record?: RunRecord;
}

export const defaultRoot = (): string =>
	join(process.env.TMPDIR ?? tmpdir(), "claudekit");

export const newRunId = (now = new Date()): string => {
	const pad = (n: number): string => String(n).padStart(2, "0");
	const day = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
	const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
	const bytes = crypto.getRandomValues(new Uint8Array(3));
	return `${day}-${time}-${Buffer.from(bytes).toString("hex")}`;
};

export const createRun = async (opts: {
	probe: string;
	root?: string;
	quiet?: boolean;
}): Promise<Run> => {
	if (!PROBE_NAME.test(opts.probe)) {
		throw new Error(
			`bad probe name: ${opts.probe}`,
		);
	}
	const id = newRunId();
	const dir = join(opts.root ?? defaultRoot(), opts.probe, id);
	await mkdir(dir, { recursive: true });
	if (!opts.quiet) {
		console.info(`run ${opts.probe}/${id} ${dir}`);
	}
	return { id, dir, probe: opts.probe };
};

export const writeRecord = async (
	run: Run,
	record: RunRecord,
): Promise<void> => {
	await Bun.write(
		join(run.dir, RECORD),
		`${JSON.stringify(record, null, "\t")}\n`,
	);
};

export const readRecord = async (dir: string): Promise<RunRecord> =>
	JSON.parse(await Bun.file(join(dir, RECORD)).text());

export const listRuns = async (opts: {
	probe?: string;
	root?: string;
}): Promise<RunSummary[]> => {
	const root = opts.root ?? defaultRoot();
	const probes = opts.probe ? [opts.probe] : await names(root);
	const lists = await Promise.all(probes.map((p) => runsOf(join(root, p))));
	return lists.flat().sort((a, b) => a.id.localeCompare(b.id));
};

// Lists what a clean would delete; deleting is a separate call.
export const planClean = async (opts: {
	probe: string;
	olderThanDays: number;
	root?: string;
	now?: number;
}): Promise<string[]> => {
	const cutoff = (opts.now ?? Date.now()) - opts.olderThanDays * DAY_MS;
	const runs = await listRuns({
		probe: opts.probe,
		...(opts.root ? { root: opts.root } : {}),
	});
	const stats = await Promise.all(
		runs.map(async (r) => ({ dir: r.dir, mtime: (await stat(r.dir)).mtimeMs })),
	);
	return stats.filter((s) => s.mtime < cutoff).map((s) => s.dir);
};

export const clean = async (
	paths: string[],
	root = defaultRoot(),
): Promise<void> => {
	const outside = paths.filter((p) => !p.startsWith(`${root}/`));
	if (outside.length > 0) {
		throw new Error(
			`outside ${root}: ${outside.join(", ")}`,
		);
	}
	await Promise.all(paths.map((p) => rm(p, { recursive: true })));
};

const names = async (dir: string): Promise<string[]> => {
	try {
		const entries = await readdir(dir, { withFileTypes: true });
		return entries.filter((e) => e.isDirectory()).map((e) => e.name);
	} catch {
		return [];
	}
};

const runsOf = async (probeDir: string): Promise<RunSummary[]> => {
	const ids = await names(probeDir);
	return Promise.all(
		ids.map(async (id) => {
			const dir = join(probeDir, id);
			const file = Bun.file(join(dir, RECORD));
			return (await file.exists())
				? { dir, id, record: await file.json() }
				: { dir, id };
		}),
	);
};
