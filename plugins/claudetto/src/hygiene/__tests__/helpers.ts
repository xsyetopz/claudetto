import { lstat, mkdir, mkdtemp, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SweepRoots } from "../sweep.ts";

export const NOW = Date.UTC(2026, 9, 30);

export const exists = async (path: string): Promise<boolean> => {
	try {
		await lstat(path);
		return true;
	} catch {
		return false;
	}
};

export const aged = async (path: string, ageMs: number): Promise<string> => {
	const at = new Date(NOW - ageMs);
	await utimes(path, at, at);
	return path;
};

export const folder = async (path: string, ageMs: number): Promise<string> => {
	await mkdir(path, { recursive: true });
	return aged(path, ageMs);
};

export const file = async (path: string, ageMs: number): Promise<string> => {
	await writeFile(path, "x");
	return aged(path, ageMs);
};

/** A `mkdtemp` folder with the roots of a sweep inside it, a live session file, and an empty handoff folder. */
export const scratch = async (
	current: string,
	live: string,
): Promise<{ home: string; roots: SweepRoots }> => {
	const home = await mkdtemp(join(tmpdir(), "hygiene-"));
	const roots: SweepRoots = {
		temps: [join(home, "tmp/claude-501")],
		project: join(home, "work"),
		sessions: join(home, "claude/sessions"),
		current,
		handoffDays: 30,
		sessionDays: 30,
		probeMinutes: 60,
		home: join(home, "fakehome"),
		now: NOW,
		dryRun: false,
	};
	await mkdir(roots.sessions, { recursive: true });
	await writeFile(
		join(roots.sessions, "1.json"),
		JSON.stringify({ sessionId: live, pid: 1 }),
	);
	await mkdir(join(roots.project, ".claude/claudetto/handoffs"), {
		recursive: true,
	});
	return { home, roots };
};
