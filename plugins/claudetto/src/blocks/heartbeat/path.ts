/** The status line reads this folder under the project to tell whether claudetto's hooks still run. */
export const HEARTBEAT_DIR = ".claude/claudetto/heartbeat";

export const heartbeatPath = (session: string): string =>
	`${HEARTBEAT_DIR}/${session.replaceAll(/[^\w-]/g, "_")}.txt`;
