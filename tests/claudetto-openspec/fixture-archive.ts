// Replays recorded `archive.execute` calls and names where the plugin differs from upstream on purpose.
import { spawn } from "bun";

import { nonEmpty } from "../../plugins/claudetto-openspec/hooks/fs.ts";
import { openspec } from "../../plugins/claudetto-openspec/hooks/openspec.ts";
import { scanTasks } from "../../plugins/claudetto-openspec/hooks/tasks.ts";
import { needsChange } from "../../plugins/claudetto-openspec/hooks/texts.ts";
import { ArchiveBlocked } from "../../plugins/claudetto-openspec/hooks/validate/archive-merge.ts";
import { archive } from "../../plugins/claudetto-openspec/hooks/validate/archive.ts";
import {
	type Entry,
	materialize,
	nodeFs,
	type Rec,
	snapshot,
} from "./fixture-kit.ts";
import { count, type Pair, same, settle, skipped } from "./fixture-tally.ts";
import injected from "./fixtures/archive-injected.json";

type Tree = Record<string, string>;
interface Outcome {
	threw: boolean;
	tree: Tree | undefined;
}
interface Outcomes {
	actual: Outcome;
	expected: Outcome;
}

export const ARCHIVE_FILES = ["archive", "misplaced-delta-files"];

// Upstream cases whose own test body fakes what the plugin has no counterpart for: `vi.spyOn` or
// `vi.mock` on its fs calls (rollback, displacement backups, inode claims, EXDEV copy, hard links), or
// fake timers under TZ. Their recorded trees are the effect of the injected fault, so nothing to replay.
const INJECTED = new Map(
	Object.entries(injected).flatMap(([kind, tests]) =>
		tests.map((t) => [t, kind] as const),
	),
);
// Cases that answer an upstream confirm prompt; the tool has none and always validates and merges.
const PROMPTED =
	/user declines|at the prompt|asking to apply|cannot be answered|JSON mode untouched|declines the spec update/u;
// The tool takes only a change name: it always validates and always merges the specs.
const NOT_CARRIED = new Set(["noValidate", "skipSpecs"]);
const PROMPT_ANSWERED_NO =
	"prompt answered no: the tool has no prompt and archives";

const spawnArgv = async (argv: string[]) => {
	const p = spawn(argv, { stderr: "pipe", stdout: "pipe" });
	return {
		exitCode: await p.exited,
		stderr: await new Response(p.stderr).text(),
	};
};

const texts = (t: Record<string, Entry> | null): Tree =>
	Object.fromEntries(
		Object.entries(t ?? {})
			.filter(([, e]) => e.text !== undefined)
			.map(([p, e]) => [p, e.text ?? ""]),
	);

const retiring = (rec: Rec) =>
	Object.entries(rec.before ?? {}).some(
		([p, e]) =>
			p.endsWith(".openspec.yaml") &&
			e.text?.includes("retire_capabilities") === true,
	);

const hasOpenTasks = (rec: Rec) =>
	Object.entries(rec.before ?? {}).some(
		([p, e]) =>
			p.endsWith("tasks.md") && scanTasks(e.text ?? "").open.length > 0,
	);

// A link in the recorded tree that points outside it: the record holds the link, not its target.
const dangling = (rec: Rec) =>
	Object.values(rec.before ?? {}).some(
		(e) => e.link !== undefined && !e.link.startsWith("$ROOT"),
	);

const excluded = (rec: Rec) => {
	const fault = INJECTED.get(rec.test);
	if (fault !== undefined) {
		return `injected ${fault}`;
	}
	return dangling(rec) ? "dangling link" : undefined;
};

// The named divergence a case falls under, if any.
const divergence = (rec: Rec, threw: boolean, blocked?: string) => {
	const wantThrew = rec.outcome.threw !== undefined;
	const reasons = [
		{
			hit: threw && !wantThrew && hasOpenTasks(rec),
			why: "open tasks refused",
		},
		{
			hit: blocked === "link_escapes" && retiring(rec),
			why: "spec.md link leaving the specs tree refused (upstream retires the link and keeps its target)",
		},
		{
			hit: rec.test.includes("validateSpecContent"),
			why: "upstream test spies validateSpecContent to force a failure (plugin validates the rebuilt spec the same, non-strict)",
		},
	];
	return reasons.find((r) => r.hit)?.why;
};

const archiveThrew = async (rec: Rec, root: string, change: string) => {
	let blocked: string | undefined;
	try {
		await archive(nodeFs, spawnArgv, root, change, "2026-11-05");
	} catch (error) {
		if (nonEmpty(process.env["COS_DEBUG"])) {
			console.info(rec.test, String(error));
		}
		blocked = error instanceof ArchiveBlocked ? error.code : "error";
	}
	return blocked;
};

// What an archive run did and what upstream recorded, as two values to compare; a side that
// upstream does not pin down (the throw of a blocked case, the tree of a refusal) is left equal.
const archiveOutcomes = async (
	rec: Rec,
	root: string,
	threw: boolean,
): Promise<Outcomes> => {
	const wantThrew = rec.outcome.threw !== undefined;
	// Upstream also "blocks" by returning with exit code 1 and the tree untouched; a throw is the same refusal.
	const blocked =
		threw && !wantThrew && same(texts(rec.after), texts(rec.before));
	const compareTree = !(wantThrew || blocked);
	return {
		actual: {
			threw: blocked ? wantThrew : threw,
			tree: compareTree ? await snapshot(root) : undefined,
		},
		expected: {
			threw: wantThrew,
			tree: compareTree ? texts(rec.after) : undefined,
		},
	};
};

const inSpecs = (p: string) => p.startsWith("openspec/specs/");
const specsPart = (tree: Tree | undefined, inside: boolean) =>
	Object.fromEntries(
		Object.entries(tree ?? {}).filter(([p]) => inSpecs(p) === inside),
	);
const sameSpecs = (x: Tree | undefined, y: Tree | undefined, inside: boolean) =>
	same(specsPart(x, inside), specsPart(y, inside));

// Where upstream was told to skip validation or the spec merge and the plugin did neither: the
// plugin refused a change that fails validation, or moved the same files and also merged the specs.
const keeps = ({ expected }: Outcomes, change: string) =>
	Object.keys(expected.tree ?? {}).some((p) =>
		p.startsWith(`openspec/changes/${change}/`),
	);

// Upstream left the main specs as they were; the plugin merged them (or retired one).
const mergedDespiteNo = (
	flags: string[],
	before: Tree,
	{ actual, expected }: Outcomes,
) =>
	flags.includes("prompt") &&
	Object.keys(expected.tree ?? {}).some((p) =>
		p.startsWith("openspec/changes/archive/"),
	) &&
	sameSpecs(expected.tree, before, true) &&
	!sameSpecs(actual.tree, expected.tree, true);

// Without validation upstream writes the emptied spec; the plugin validated and retired it.
const retiredEmptied = (flags: string[], { actual, expected }: Outcomes) => {
	const have = specsPart(actual.tree, true);
	const emptied = Object.entries(specsPart(expected.tree, true)).filter(
		([p]) => !(p in have),
	);
	return (
		flags.includes("noValidate") &&
		emptied.length > 0 &&
		emptied.every(([, t]) => !t.includes("### Requirement:")) &&
		Object.entries(have).every(([p, t]) => expected.tree?.[p] === t)
	);
};

const unmatched = (
	flags: string[],
	blocked: string | undefined,
	before: Tree,
	outcomes: Outcomes,
	change: string,
) => {
	const { actual, expected } = outcomes;
	if (blocked !== undefined) {
		return blocked === "invalid_delta"
			? `${flags.join("+")} not carried: refused as invalid`
			: undefined;
	}
	// A prompt answered no leaves the change where it was; the tool has no prompt and archives it.
	if (
		(flags.includes("prompt") && keeps(outcomes, change)) ||
		mergedDespiteNo(flags, before, outcomes)
	) {
		return PROMPT_ANSWERED_NO;
	}
	if (retiredEmptied(flags, outcomes)) {
		return "noValidate not carried: emptied spec retired";
	}
	return sameSpecs(actual.tree, expected.tree, false) &&
		sameSpecs(expected.tree, before, true)
		? `${flags.join("+")} not carried: specs differ, the rest of the tree equal`
		: undefined;
};

const flagDivergence = (
	flags: string[],
	blocked: string | undefined,
	before: Tree,
	outcomes: Outcomes,
	change: string,
) =>
	same(outcomes.actual, outcomes.expected)
		? undefined
		: unmatched(flags, blocked, before, outcomes, change);

export const carriedFlags = (rec: Rec, options: object | undefined) => [
	...Object.keys(options ?? {}).filter((k) => NOT_CARRIED.has(k)),
	...(PROMPTED.test(rec.test) ? ["prompt"] : []),
];

// Upstream prompts for a change; the tool's archive call without one is answered by needsChange.
export const replayNoChange = async (name: string, rec: Rec): Promise<Pair> => {
	const { root } = await materialize(rec);
	const deps = { fs: nodeFs, run: spawnArgv, root, date: "2026-11-05" };
	const reply = await openspec(deps, { action: "archive" });
	count(name, "diverged: no change name: tool asks for one");
	return {
		actual: { reply, tree: await snapshot(root) },
		expected: { reply: needsChange("archive"), tree: texts(rec.before) },
	};
};

export const replayArchive = async (
	name: string,
	rec: Rec,
	change: string,
	flags: string[],
): Promise<Pair> => {
	const why = excluded(rec);
	if (why !== undefined) {
		count(name, `excluded: ${why}`);
		return skipped(why);
	}
	const { root } = await materialize(rec);
	const blocked = await archiveThrew(rec, root, change);
	const threw = blocked !== undefined;
	const reason = divergence(rec, threw, blocked);
	if (reason !== undefined) {
		count(name, `diverged: ${reason}`);
		return skipped(reason);
	}
	const outcomes = await archiveOutcomes(rec, root, threw);
	const flagged =
		flags.length > 0
			? flagDivergence(flags, blocked, texts(rec.before), outcomes, change)
			: undefined;
	if (flagged !== undefined) {
		count(name, `diverged: ${flagged}`);
		return skipped(flagged);
	}
	return settle(name, outcomes);
};
