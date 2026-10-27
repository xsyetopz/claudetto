// The benign set: the tool calls that ran or that the user approved, read from the transcripts of Claude Code (read only). The report never holds their content.

import { homedir } from "node:os";
import { join } from "node:path";
import { file as bunFile, Glob } from "bun";
import { isRecord } from "../../plugins/claudetto/modules/gate/domain/gate.ts";
import type { Call, CallSet } from "./types.ts";

/** The text of a result that a refused call gets: the user said no, or a rule denied it. Such a call is not benign. */
const REFUSED = /doesn't want to proceed|permission[^.]*denied|was rejected/i;

/** The parts of the `message.content` of one transcript line, or none for a line that is not JSON or is a subagent line. */
const partsOf = (
	line: string,
): { cwd: unknown; part: Record<string, unknown> }[] => {
	let row: unknown;
	try {
		row = JSON.parse(line);
	} catch {
		return [];
	}
	if (!isRecord(row) || row["isSidechain"] === true) {
		return [];
	}
	const message = row["message"];
	const content = isRecord(message) ? message["content"] : undefined;
	return (Array.isArray(content) ? content : [])
		.filter(isRecord)
		.map((part) => ({ cwd: row["cwd"], part }));
};

/** The benign calls of one transcript `text`: each main-thread `tool_use` that has a `tool_result` which is not a refusal. `session` prefixes the ids. */
export const benignOf = (text: string, session: string): Call[] => {
	const uses = new Map<string, Call>();
	const ended = new Set<string>();
	const refused = new Set<string>();
	for (const { cwd, part } of text.split("\n").flatMap(partsOf)) {
		const id = String(part["id"] ?? part["tool_use_id"] ?? "");
		if (part["type"] === "tool_use" && isRecord(part["input"])) {
			uses.set(id, {
				id: `${session}:${id.slice(-8)}`,
				tool: String(part["name"]),
				input: part["input"],
				cwd: typeof cwd === "string" ? cwd : undefined,
			});
		} else if (part["type"] === "tool_result") {
			ended.add(id);
			if (
				part["is_error"] === true &&
				REFUSED.test(JSON.stringify(part["content"]))
			) {
				refused.add(id);
			}
		}
	}
	return [...uses]
		.filter(([id]) => ended.has(id) && !refused.has(id))
		.map(([, call]) => call);
};

/** The calls of `files` under `root` in order, until `limit` calls. */
const collect = async (
	root: string,
	files: readonly string[],
	limit: number,
	found: Call[] = [],
): Promise<Call[]> => {
	const [f, ...rest] = files;
	if (f === undefined || found.length >= limit) {
		return found.slice(0, limit);
	}
	const session = (f.split("/")[1] ?? f).slice(0, 8);
	const calls = benignOf(await bunFile(join(root, f)).text(), session);
	return collect(root, rest, limit, [...found, ...calls]);
};

/** The benign set of `root` (default `~/.claude/projects`): at most `limit` calls, from the transcripts in path order, of the project folders whose name contains one of `projects` (all when empty). */
export const loadBenign = async (
	limit: number,
	projects: string[],
	root = join(homedir(), ".claude", "projects"),
): Promise<CallSet> => {
	const files = [...new Glob("*/*.jsonl").scanSync(root)]
		.filter((f) => projects.length === 0 || projects.some((p) => f.includes(p)))
		.sort((a, b) => Number(a > b) - Number(a < b));
	return {
		name: "benign",
		calls: await collect(root, files, limit),
		skipped: 0,
	};
};
