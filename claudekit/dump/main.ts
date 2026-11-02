#!/usr/bin/env -S bun --no-env-file
// Usage: bun claudekit/dump/main.ts SESSION.jsonl FIRST_UUID LAST_UUID
// Resumes the rows FIRST..LAST of a saved session in a scratch folder and makes one Haiku call, so the
// dump plugin writes what `$.session.messages()` returns for those rows to `claudekit/dumps/<id>/`.

import { randomUUID } from "node:crypto";
import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import {
	allowedTools,
	claudeArgv,
	maxBudget,
	model,
	outputFormat,
	pluginDir,
	print,
	settingSources,
} from "../session/argv.ts";
import { spawnCommand } from "../session/command.ts";
import { makeFolders } from "../session/folders.ts";
import { DUMPS_ENV } from "./plugin/register.ts";

const DUMPS = path.join(import.meta.dir, "../dumps");
const PLUGIN = path.join(import.meta.dir, "plugin");
const BUDGET_USD = "0.50";

type Row = Record<string, unknown> & { uuid?: string };

// A `goal_status` row re-arms the saved session's goal on resume, and its Stop hook then answers the probe's prompt.
const REARMS = new Set(["goal_status"]);

const attachmentType = (row: Row): unknown => {
	const a = row["attachment"];
	return typeof a === "object" && a !== null && "type" in a
		? a.type
		: undefined;
};

/** The rows from `from` to `to`, chained to each other alone and moved into session `session` at `folder`. */
export const sliceOf = (
	all: readonly Row[],
	from: string,
	to: string,
	session: string,
	folder: string,
): Row[] => {
	const start = all.findIndex((r) => r.uuid?.startsWith(from));
	const end = all.findIndex((r) => r.uuid?.startsWith(to));
	if (start < 0 || end < start) {
		throw new Error(`no rows from \`${from}\` to \`${to}\``);
	}
	return all
		.slice(start, end + 1)
		.filter(
			(r) =>
				r.uuid !== undefined && !REARMS.has(String(attachmentType(r) ?? "")),
		)
		.map((r, i, kept) => ({
			...r,
			parentUuid: kept[i - 1]?.uuid ?? null,
			sessionId: session,
			cwd: folder,
		}));
};

const [source, first, last] = process.argv.slice(2);
if (!(source && first && last)) {
	throw new Error(
		"Usage: bun claudekit/dump/main.ts SESSION.jsonl FIRST_UUID LAST_UUID",
	);
}
const id = randomUUID();
const { work } = await makeFolders("/tmp/claudekit-dump-");
const cwd = await realpath(work);
const rows = (await readFile(source, "utf8"))
	.split("\n")
	.filter(Boolean)
	.map((l): Row => JSON.parse(l));
const project = path.join(
	process.env["CLAUDE_CONFIG_DIR"] ?? path.join(homedir(), ".claude"),
	"projects",
	cwd.replace(/[^a-zA-Z0-9]/g, "-"),
);
await mkdir(project, { recursive: true });
await writeFile(
	path.join(project, `${id}.jsonl`),
	`${sliceOf(rows, first, last, id, cwd)
		.map((r) => JSON.stringify(r))
		.join("\n")}\n`,
);
const out = path.join(DUMPS, id);
await mkdir(out, { recursive: true });
const ran = await spawnCommand(
	claudeArgv(
		["--resume", id],
		print("Run `true` with the Bash tool, then stop."),
		model("claude-haiku-5-5"),
		settingSources("project", "local"),
		pluginDir(PLUGIN),
		allowedTools("Bash(true)"),
		maxBudget(BUDGET_USD),
		outputFormat("json"),
	),
	{ cwd, env: { [DUMPS_ENV]: out } },
);
const cost = (() => {
	try {
		const value: unknown = JSON.parse(ran.stdout).total_cost_usd;
		return typeof value === "number" ? `$${value.toFixed(4)}` : "unread";
	} catch {
		return "unread";
	}
})();
process.stdout.write(
	`exit ${ran.code}, cost ${cost}, dumps in ${out}\n${ran.code === 0 ? "" : ran.stderr.slice(0, 2000)}`,
);
