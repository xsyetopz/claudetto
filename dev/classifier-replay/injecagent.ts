// The attack set: the attacker cases of a local clone of InjecAgent, mapped to Claude Code calls by `INJECAGENT_MAP`. Nothing of the data is copied into this repo.

import { join } from "node:path";
import { file as bunFile } from "bun";
import { INJECAGENT_MAP } from "./mapping.ts";
import type { Call, CallSet } from "./types.ts";

/** The attacker case files of the clone, under `data/`. */
export const INJECAGENT_FILES = [
	"attacker_cases_dh.jsonl",
	"attacker_cases_ds.jsonl",
];

/** The calls of one case: one for each attacker tool with an entry in the map. */
const callsOf = (id: string, tools: unknown, home: string): Call[] =>
	(Array.isArray(tools) ? tools : []).flatMap((name, i) => {
		const mapped = INJECAGENT_MAP[String(name)];
		if (!mapped) {
			return [];
		}
		const input = Object.fromEntries(
			Object.entries(mapped.input).map(([k, v]) => [
				k,
				v.replaceAll("{home}", home),
			]),
		);
		return [{ id: `${id}.${i}`, tool: mapped.tool, input }];
	});

/** The attack set of the clone at `dir`. Each case is a group of calls, so the set holds `groups`, the calls of a case together, and `skipped` counts the cases with no call. */
export const loadInjecAgent = async (
	dir: string,
	home: string,
): Promise<CallSet & { groups: Call[][] }> => {
	const texts = await Promise.all(
		INJECAGENT_FILES.map((name) => bunFile(join(dir, "data", name)).text()),
	);
	const cases = texts.flatMap((text, f) =>
		text
			.split("\n")
			.filter((l) => l.trim() !== "")
			.map((line, n) => {
				const row: unknown = JSON.parse(line);
				const tools =
					typeof row === "object" && row !== null
						? Reflect.get(row, "Attacker Tools")
						: undefined;
				return callsOf(`${f === 0 ? "dh" : "ds"}${n}`, tools, home);
			}),
	);
	const groups = cases.filter((calls) => calls.length > 0);
	return {
		name: "attack",
		calls: groups.flat(),
		groups,
		skipped: cases.length - groups.length,
	};
};
