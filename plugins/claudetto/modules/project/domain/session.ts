// The project root and the running agents of a session (D6 of change `redesign-0-4-0`).
// The caller gives each read as a port, because the mod runtime follows `$` into no imported arrow function.

const RUNNING = new Set(["pending", "running", "waiting"]);

/** The agents of `agents` with work in flight: `pending`, `running`, or `waiting`. */
export const runningAgents = <T extends { status: string }>(
  agents: readonly T[],
): T[] => agents.filter((a) => RUNNING.has(a.status));

/** The project root: `CLAUDE_PROJECT_DIR`, or the root of the session, or `""` with no root. A read that fails counts as not set. */
export const projectRoot = async (io: {
  dir: () => Promise<string | undefined>;
  root: () => Promise<string>;
}): Promise<string> =>
  (await io.dir().catch(() => undefined)) || (await io.root().catch(() => ""));
