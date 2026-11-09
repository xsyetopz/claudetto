/** The status line reads these folders under the project: the heartbeat tells whether claudetto's hooks still run, the line file holds what stdin lacks. */
const HEARTBEAT_DIR = ".claude/claudetto/heartbeat";
const LINE_DIR = ".claude/claudetto/statusline";

const fileName = (session: string): string =>
	session.replaceAll(/[^\w-]/g, "_");

export const heartbeatPath = (session: string): string =>
	`${HEARTBEAT_DIR}/${fileName(session)}.txt`;

export const lineFilePath = (session: string): string =>
	`${LINE_DIR}/${fileName(session)}.json`;
