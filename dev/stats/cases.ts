// The cases of the result files: the current `case.yaml` files, the match of a result to a case, and the entry of each case.

import { join } from "node:path";
import { file as bunFile, Glob } from "bun";
import { parse } from "yaml";

/** The order of the default `sort`: by UTF-16 code unit. */
export const byCodeUnit = (x: string, y: string): number =>
	Number(x > y) - Number(x < y);

export interface Run {
	score: number;
	passed: boolean;
	costUsd?: number;
	graders?: { name: string; judgeVotes?: boolean[] | undefined }[];
}
export interface RawCase {
	name: string;
	promptMarkdown?: string;
	graders?: { name: string; type: string }[];
	arms: { with?: Run[]; without?: Run[] };
}
export interface Aggregate {
	claudeVersion?: string;
	startedAt?: string;
	suite?: { modelOverride?: string | null };
	cases: RawCase[];
}
export interface Source {
	file: string;
	claudeVersion: string;
	model: string;
}
export interface Entry {
	source: string;
	startedAt: string;
	case: RawCase;
	/** The name of the current case that this result belongs to, which differs from the name in the result when the case was renamed. */
	name: string;
	set: string;
	/** True when no current case has this prompt and these graders. */
	stale: boolean;
}
/** What a current `case.yaml` says about a case. */
export interface CaseInfo {
	set: string;
	prompt: string;
	graders: string[];
}

/** The set, prompt, and grader names of each current case, by case name, from the `case.yaml` files under `root`. */
export const caseInfos = async (
	root: string,
	glob = "plugins/claudetto/evals/*/case.yaml",
): Promise<Map<string, CaseInfo>> => {
	const infos = new Map<string, CaseInfo>();
	for await (const f of new Glob(glob).scan(root)) {
		const doc = parse(await bunFile(join(root, f)).text());
		if (!doc?.name) {
			continue;
		}
		const tag = (doc.tags ?? []).find((t: string) => t.startsWith("set:"));
		infos.set(doc.name, {
			set: tag ? tag.slice(4) : "untagged",
			prompt: String(doc.execution?.prompt ?? ""),
			graders: (doc.graders ?? []).map((g: { name?: string }) => g.name ?? ""),
		});
	}
	return infos;
};

const sameNames = (a: string[], b: string[]): boolean =>
	a.length === b.length &&
	[...a].sort(byCodeUnit).join("\n") === [...b].sort(byCodeUnit).join("\n");

/**
 * The current case that a result case belongs to: the case of the same name when its prompt and graders match, else another current case that matches.
 * It returns `undefined` when none matches, so the result is stale.
 */
export const resolveCase = (
	c: RawCase,
	infos: Map<string, CaseInfo>,
): { name: string; set: string } | undefined => {
	const matches = (info: CaseInfo): boolean =>
		(c.promptMarkdown === undefined ||
			c.promptMarkdown.trim() === info.prompt.trim()) &&
		(c.graders === undefined ||
			sameNames(
				c.graders.map((g) => g.name),
				info.graders,
			));
	const own = infos.get(c.name);
	if (own && matches(own)) {
		return { name: c.name, set: own.set };
	}
	for (const [name, info] of [...infos.entries()].sort(([a], [b]) =>
		a.localeCompare(b),
	)) {
		if (matches(info)) {
			return { name, set: info.set };
		}
	}
	return undefined;
};

/** Every `aggregate-result.json` file at or under the given files and folders, sorted. */
export const findResultFiles = async (paths: string[]): Promise<string[]> => {
	const found = await Promise.all(
		paths.map(async (p) => {
			if (p.endsWith(".json")) {
				return [p];
			}
			const files: string[] = [];
			for await (const f of new Glob("**/aggregate-result.json").scan({
				cwd: p,
			})) {
				files.push(join(p, f));
			}
			return files;
		}),
	);
	return [...new Set(found.flat())].sort(byCodeUnit);
};

/** True when `entry` replaces `old`: it is the first, or it is newer (or older, with `pick` set to `oldest`). */
const isChosen = (
	entry: Entry,
	old: Entry | undefined,
	pick: "newest" | "oldest",
): boolean =>
	old === undefined ||
	(pick === "newest"
		? entry.startedAt > old.startedAt
		: entry.startedAt < old.startedAt);

/** The entries of the files, one for each case: the newest by `startedAt`, or the oldest with `pick` set to `oldest`. */
export const chooseEntries = (
	files: { file: string; data: Aggregate }[],
	pick: "newest" | "oldest" = "newest",
	infos: Map<string, CaseInfo> = new Map(),
): { sources: Source[]; entries: Entry[] } => {
	const sources: Source[] = files.map(({ file, data }) => ({
		file,
		claudeVersion: data.claudeVersion ?? "unknown",
		model: data.suite?.modelOverride ?? "default",
	}));
	const best = new Map<string, Entry>();
	for (const { file, data } of files) {
		for (const c of data.cases) {
			const found = resolveCase(c, infos);
			const entry: Entry = {
				source: file,
				startedAt: data.startedAt ?? "",
				case: c,
				name: found?.name ?? c.name,
				set: found?.set ?? "stale",
				stale: found === undefined,
			};
			const key = entry.stale ? `stale:${c.name}` : entry.name;
			if (isChosen(entry, best.get(key), pick)) {
				best.set(key, entry);
			}
		}
	}
	return {
		sources,
		entries: [...best.values()].sort((a, b) => a.name.localeCompare(b.name)),
	};
};
