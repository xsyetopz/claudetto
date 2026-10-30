// The caller gives each read as a port: the mod runtime follows `$` into no imported arrow function.

const RUNNING = new Set(["pending", "running", "waiting"]);

export const runningAgents = <T extends { status: string }>(
	agents: readonly T[],
): T[] => agents.filter((a) => RUNNING.has(a.status));

/** A read that fails counts as not set. */
export const projectRoot = async (io: {
	dir: () => Promise<string | undefined>;
	root: () => Promise<string>;
}): Promise<string> =>
	(await io.dir().catch(() => undefined)) || (await io.root().catch(() => ""));
