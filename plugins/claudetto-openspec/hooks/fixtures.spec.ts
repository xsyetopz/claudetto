// Upstream's recorded behaviour, replayed through the plugin's code on a real temp tree (bun test only:
// the lab has no node APIs). A case either equals upstream, or is a named divergence; nothing else passes.
import { afterAll, describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { posix } from "node:path";

import { spawn } from "bun";

import { archive, ArchiveBlocked, mergeSpec } from "./archive.ts";
import {
	type Entry,
	load,
	materialize,
	nodeFs,
	type Rec,
	snapshot,
} from "./fixture-kit.ts";
import injected from "./fixtures/archive-injected.json";
import { dirname, join } from "./fs.ts";
import { openspec } from "./openspec.ts";
import { type Issue, type Report, validateSpec } from "./spec-rules.ts";
import { missingCheckboxes, numberingIssues, scanTasks } from "./tasks.ts";
import { needsChange } from "./texts.ts";
import { discoverDeltas, issueKey, validateDir } from "./validate.ts";

const CRLF = /\r\n?/g;
const BLANKS = /\n\s*\n+/g;
type Obj = any;
const tally: Record<string, Record<string, number>> = {};
const count = (file: string, what: string) => {
	tally[file] ??= {};
	tally[file][what] = (tally[file][what] ?? 0) + 1;
};
afterAll(() => {
	for (const [f, c] of Object.entries(tally)) {
		console.log(f, JSON.stringify(c));
	}
});

const summary = (r: Report) => ({
	valid: r.valid,
	issues: r.issues.map(issueKey).sort((x, y) => x.localeCompare(y)),
});
const refuses = (i: Issue) =>
	i.level === "INFO" && i.message.startsWith("Archive would refuse");
const expectedSummary = (r: Report) => {
	const issues = r.issues.map((i): Issue =>
		refuses(i) ? { ...i, level: "ERROR" } : i,
	);
	return summary({
		valid: r.valid && !issues.some((i) => i.level === "ERROR"),
		issues,
	});
};
type Sum = ReturnType<typeof summary>;
// Upstream warns where the plugin refuses (#2195): same files, ERROR instead.
const asError = (s: Sum) => ({
	valid: s.valid && !s.issues.some((i) => i.startsWith("WARNING|")),
	issues: s.issues.map((i) => i.replace("WARNING|", "ERROR|")),
});

interface Result {
	actual: unknown;
	expected: unknown;
	diverged?: string;
}

const validated = async (
	_r: Rec,
	args: Obj,
	expected: Obj,
): Promise<Result> => {
	const actual = summary(
		await validateDir(
			nodeFs,
			args.args[0],
			args.args[1]?.mainSpecsDir,
			args.strict,
		),
	);
	const want = expectedSummary(expected.returned);
	if (JSON.stringify(actual) === JSON.stringify(want)) {
		return { actual, expected: want };
	}
	const stricter = asError(want);
	if (JSON.stringify(actual) === JSON.stringify(stricter)) {
		return { actual, expected: want, diverged: "warning->error (#2195)" };
	}
	// #2173: the plugin names a stray file or repeats a root error; upstream's own errors all remain.
	const added = actual.issues.filter((i) => !stricter.issues.includes(i));
	if (
		stricter.issues.every((i) => actual.issues.includes(i)) &&
		added.every((i) => i.startsWith("ERROR|"))
	) {
		return {
			actual,
			expected: want,
			diverged: "extra stray-file error (#2173)",
		};
	}
	return { actual, expected: want };
};

const runners: Record<
	string,
	(rec: Rec, args: Obj, expected: Obj) => Promise<Result>
> = {
	"task.checkboxes": async (_r, args, e) => ({
		actual: missingCheckboxes(args[0]),
		expected: e.returned,
	}),
	"task.numbering": async (_r, args, e) => ({
		actual: numberingIssues(args[0]),
		expected: e.returned,
	}),
	"discovery.findUnreadDeltaFiles": async (_r, args, e) => ({
		actual: (await discoverDeltas(nodeFs, args[0])).unread,
		expected: e.returned,
	}),
	"validator.validateSpec": async (_r, args, e) => ({
		actual: summary(
			validateSpec(await readFile(args.args[0], "utf8"), args.strict),
		),
		expected: expectedSummary(e.returned),
	}),
	"validator.validateSpecContent": async (_r, args, e) => ({
		actual: summary(validateSpec(args.args[1], args.strict)),
		expected: expectedSummary(e.returned),
	}),
	"validator.validateChangeDeltaSpecs": validated,
	"apply.findSpecUpdates": async (_r, args, e) => {
		const found = (await discoverDeltas(nodeFs, join(args[0], "specs"))).found;
		const actual = await Promise.all(
			found.map(async (d) => ({
				id: d.id,
				exists: await nodeFs.exists(join(args[1], d.id, "spec.md")),
			})),
		);
		return {
			actual,
			expected: e.returned.map((u: Obj) => ({
				id: u.id,
				exists: u.exists,
			})),
		};
	},
	"apply.buildUpdatedSpec": async (_r, args, e) => {
		const u = args[0];
		return built(
			await mergeSpec(
				nodeFs,
				dirname(dirname(u.target)),
				args[1],
				u.id,
				u.source,
			),
			e.returned.rebuilt,
		);
	},
	// Upstream's write is the rebuilt text put at the target (through a link, keeping it); the
	// plugin's equivalent is its own merge of the same delta, compared with the file left behind.
	"apply.writeUpdatedSpec": async (rec, args) => {
		const [u] = args;
		const name = u.source.split("/specs/")[0].split("/").pop();
		return built(
			await mergeSpec(nodeFs, u.targetRoot, name, u.id, u.source),
			writtenText(rec, u.target),
		);
	},
};

// Line endings and blank-line runs are upstream's serialization; the plugin writes LF and one blank line.
const built = (actual: string | null, want: string): Result => {
	const flat = (t: string) =>
		t.replace(CRLF, "\n").replace(BLANKS, "\n").trim();
	return {
		actual,
		expected: want,
		...(actual !== want &&
			flat(actual ?? "") === flat(want) && {
				diverged: "line endings / blank runs (serialization)",
			}),
	};
};

// The text a recorded `after` tree holds at an absolute target, followed through a relative link.
const writtenText = (rec: Rec, target: string) => {
	const after = rec.after ?? {};
	const key =
		Object.keys(after)
			.filter((k) => target.endsWith(`/${k}`))
			.sort((a, b) => b.length - a.length)[0] ?? "";
	const link = after[key]?.link;
	const real = link
		? posix.normalize(posix.join(posix.dirname(key), link))
		: key;
	return after[real]?.text ?? "";
};

const files = [
	"task-checkboxes",
	"task-numbering",
	"archive",
	"misplaced-delta-files",
	"validation",
	"validation.archive-preflight",
	"validation.enriched-messages",
	"validation.purpose-placeholder",
	"validation.scenario-body-parity",
	"validation.scenario-loss",
	"validation.scenario-steps",
	"validation.skip-specs",
	"validation.unknown-metadata-keys",
	"specs-apply.comment-masking.security",
	"specs-apply.fence-preservation",
	"specs-apply.line-endings",
	"specs-apply.project-linked-spec",
	"specs-apply.requirement-name-near-miss",
	"specs-apply.salvage",
	"specs-apply.security",
	"specs-apply.serialization",
	"specs-apply.symlink-escape.security",
];

// Upstream injects an fs failure through vi.mock; a recorded before-tree cannot reproduce it.
const MOCKED_FS = [
	"advisory discovery encounters a filesystem error",
	"target read failure (EACCES)",
];

// Upstream's retireSpec unit takes a target path and a specs root from the caller; the plugin's
// retirement derives both from the capability id inside archive, so no call reaches those inputs:
// unlink and lstat failures are vi.spyOn injections, the vanished spec has no return value to
// compare (`rm -f` is a no-op), and a target beside or a root named through a link cannot be built.
const RETIRE_UNIT =
	"upstream's retireSpec unit takes a caller-chosen target and root, injected failures, or a return value; the plugin's retirement is derived from the id and replayed through archive.execute";

// Why a record cannot be replayed (an empty string: it is replayed by the archive block below).
const notReplayable = (name: string, rec: Rec) => {
	if (rec.kind === "archive.execute") {
		return "";
	}
	if (rec.kind === "validator.validateChange") {
		return "upstream's proposal-prose pass is informative: archive prints it and never blocks on it, and validate never calls it";
	}
	if (rec.kind === "apply.writeUpdatedSpec" && rec.outcome.threw) {
		return "a link or file swapped between upstream's resolve and its write, injected with vi.spyOn";
	}
	if (rec.kind === "apply.retireSpec") {
		return RETIRE_UNIT;
	}
	if (MOCKED_FS.some((m) => rec.test.includes(m))) {
		return "upstream fs failure injected with vi.mock";
	}
	return name.includes("comment-masking") &&
		!Object.keys(rec.before ?? {}).some((p) => p.endsWith("spec.md"))
		? "the recording kept no delta file (the stress input is generated at test time)"
		: undefined;
};

// Upstream refused; the plugin must refuse too, by throwing or by reporting an invalid change.
const refusedBy = async (
	run: (rec: Rec, args: Obj, expected: Obj) => Promise<Result>,
	rec: Rec,
	args: Obj,
	outcome: Obj,
) => {
	try {
		const { actual } = await run(rec, args, outcome);
		return typeof actual === "object" &&
			actual !== null &&
			"valid" in actual &&
			actual.valid === false
			? "reported"
			: undefined;
	} catch {
		return "threw";
	}
};

const archiveExcluded = (rec: Rec) => {
	const fault = INJECTED.get(rec.test);
	if (fault) {
		return `injected ${fault}`;
	}
	return dangling(rec) ? "dangling link" : undefined;
};

for (const name of files) {
	describe(name, async () => {
		for (const rec of await load(name)) {
			const run = runners[rec.kind];
			const why = notReplayable(name, rec);
			if (why !== undefined) {
				if (why) {
					count(name, `excluded: ${why}`);
				}
				continue;
			}
			if (!run) {
				count(name, "not wired");
				continue;
			}
			test(`${rec.kind} ${rec.test}`, async () => {
				const { args, expected: outcome } = await materialize(rec);
				if (rec.outcome.threw) {
					const refusal = await refusedBy(run, rec, args, outcome);
					count(name, `upstream threw: plugin ${refusal ?? "SUCCEEDED"}`);
					expect(refusal).toBeDefined();
					return;
				}
				const r = await run(rec, args, outcome);
				if (r.diverged) {
					count(name, `diverged: ${r.diverged}`);
					return;
				}
				try {
					expect(r.actual).toEqual(r.expected);
				} catch (error) {
					count(name, "FAIL");
					throw error;
				}
				count(name, "pass");
			});
		}
	});
}

const spawnArgv = async (argv: string[]) => {
	const p = spawn(argv, { stderr: "pipe", stdout: "pipe" });
	return {
		exitCode: await p.exited,
		stderr: await new Response(p.stderr).text(),
	};
};

const texts = (t: Record<string, Entry> | null) =>
	Object.fromEntries(
		Object.entries(t ?? {})
			.filter(([, e]) => e.text !== undefined)
			.map(([p, e]) => [p, e.text ?? ""]),
	);

const retiring = (rec: Rec) =>
	Object.entries(rec.before ?? {}).some(
		([p, e]) =>
			p.endsWith(".openspec.yaml") && e.text?.includes("retire_capabilities"),
	);

const hasOpenTasks = (rec: Rec) =>
	Object.entries(rec.before ?? {}).some(
		([p, e]) =>
			p.endsWith("tasks.md") && scanTasks(e.text ?? "").open.length > 0,
	);

// The named divergence a case falls under, if any.
const divergence = (rec: Rec, threw: boolean, blocked?: string) => {
	const wantThrew = rec.outcome.threw !== undefined;
	const reason = [
		[threw && !wantThrew && hasOpenTasks(rec), "open tasks refused (#2006)"],
		[
			blocked === "link_escapes" && retiring(rec),
			"spec.md link leaving the specs tree refused (upstream retires the link and keeps its target)",
		],
		[
			rec.test.includes("validateSpecContent"),
			"upstream test spies validateSpecContent to force a failure (plugin validates the rebuilt spec the same, non-strict)",
		],
	].find(([hit]) => hit);
	return reason?.[1];
};

const archiveThrew = async (rec: Rec, root: string, change: string) => {
	try {
		await archive(nodeFs, spawnArgv, root, change, "2026-11-05");
		return undefined;
	} catch (error) {
		if (process.env["COS_DEBUG"]) {
			console.log(rec.test, String(error));
		}
		return error instanceof ArchiveBlocked ? error.code : "error";
	}
};

// What an archive run did and what upstream recorded, as two values to compare; a side that
// upstream does not pin down (the throw of a blocked case, the tree of a refusal) is left equal.
const archiveOutcomes = async (rec: Rec, root: string, threw: boolean) => {
	const wantThrew = rec.outcome.threw !== undefined;
	// Upstream also "blocks" by returning with exit code 1 and the tree untouched; a throw is the same refusal.
	const blocked =
		threw &&
		!wantThrew &&
		JSON.stringify(texts(rec.after)) === JSON.stringify(texts(rec.before));
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

// The tool takes only a change name: it always validates and always merges the specs.
const NOT_CARRIED = ["noValidate", "skipSpecs"];
const inSpecs = (p: string) => p.startsWith("openspec/specs/");
const specsPart = (tree: Record<string, string> | undefined, inside: boolean) =>
	Object.fromEntries(
		Object.entries(tree ?? {}).filter(([p]) => inSpecs(p) === inside),
	);

// Where upstream was told to skip validation or the spec merge and the plugin did neither: the
// plugin refused a change that fails validation, or moved the same files and also merged the specs.
const keeps = (
	{ expected }: Awaited<ReturnType<typeof archiveOutcomes>>,
	change: string,
) =>
	Object.keys(expected.tree ?? {}).some((p) =>
		p.startsWith(`openspec/changes/${change}/`),
	);

const flagDivergence = (
	flags: string[],
	blocked: string | undefined,
	kept: boolean,
	before: Record<string, string>,
	{ actual, expected }: Awaited<ReturnType<typeof archiveOutcomes>>,
) => {
	if (JSON.stringify(actual) === JSON.stringify(expected)) {
		return;
	}
	if (blocked) {
		return blocked === "invalid_delta"
			? `${flags.join("+")} not carried: refused as invalid`
			: undefined;
	}
	// A prompt answered no leaves the change where it was; the tool has no prompt and archives it.
	if (flags.includes("prompt") && kept) {
		return "prompt answered no: the tool has no prompt and archives";
	}
	// Upstream left the main specs as they were; the plugin merged them (or retired one).
	const same = (
		x: Record<string, string> | undefined,
		y: Record<string, string>,
		inside: boolean,
	) =>
		JSON.stringify(specsPart(x, inside)) ===
		JSON.stringify(specsPart(y, inside));
	if (
		flags.includes("prompt") &&
		Object.keys(expected.tree ?? {}).some((p) =>
			p.startsWith("openspec/changes/archive/"),
		) &&
		same(expected.tree, before, true) &&
		!same(actual.tree, expected.tree ?? {}, true)
	) {
		return "prompt answered no: the tool has no prompt and archives";
	}
	// Without validation upstream writes the emptied spec; the plugin validated and retired it.
	const have = specsPart(actual.tree, true);
	const emptied = Object.entries(specsPart(expected.tree, true)).filter(
		([p]) => !(p in have),
	);
	if (
		flags.includes("noValidate") &&
		emptied.length > 0 &&
		emptied.every(([, t]) => !t.includes("### Requirement:")) &&
		Object.entries(have).every(([p, t]) => expected.tree?.[p] === t)
	) {
		return "noValidate not carried: emptied spec retired";
	}
	return same(actual.tree, expected.tree ?? {}, false) &&
		same(expected.tree, before, true)
		? `${flags.join("+")} not carried: specs differ, the rest of the tree equal`
		: undefined;
};

const ARCHIVE_FILES = ["archive", "misplaced-delta-files"];

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
	/user declines|at the prompt|asking to apply|cannot be answered|JSON mode untouched|declines the spec update/;
// A link in the recorded tree that points outside it: the record holds the link, not its target.
const dangling = (rec: Rec) =>
	Object.values(rec.before ?? {}).some(
		(e) => e.link !== undefined && !e.link.startsWith("$ROOT"),
	);

const archived = (
	await Promise.all(
		ARCHIVE_FILES.map(async (name) =>
			(await load(name)).map((rec) => ({ name, rec })),
		),
	)
).flat();

describe("archive", () => {
	for (const { name, rec } of archived) {
		if (rec.kind !== "archive.execute") {
			continue;
		}
		const [change, opts]: [string | undefined, Obj | null | undefined] =
			rec.args.args;
		if (!change) {
			// Upstream prompts for a change; the tool's archive call without one is answered by needsChange.
			test(`archive.execute ${rec.test}`, async () => {
				const { root } = await materialize(rec);
				const deps = { fs: nodeFs, run: spawnArgv, root, date: "2026-11-05" };
				expect(await openspec(deps, { action: "archive" })).toBe(
					needsChange("archive"),
				);
				expect(await snapshot(root)).toEqual(texts(rec.before));
				count(name, "diverged: no change name: tool asks for one");
			});
			continue;
		}
		const flags = [
			...Object.keys(opts ?? {}).filter((k) => NOT_CARRIED.includes(k)),
			...(PROMPTED.test(rec.test) ? ["prompt"] : []),
		];
		test(`archive.execute ${rec.test}`, async () => {
			const why = archiveExcluded(rec);
			if (why) {
				count(name, `excluded: ${why}`);
				return;
			}
			const { root } = await materialize(rec);
			const blocked = await archiveThrew(rec, root, change);
			const threw = blocked !== undefined;
			const reason = divergence(rec, threw, blocked);
			if (reason) {
				count(name, `diverged: ${reason}`);
				return;
			}
			try {
				const outcomes = await archiveOutcomes(rec, root, threw);
				const flagged =
					flags.length > 0 &&
					flagDivergence(
						flags,
						blocked,
						keeps(outcomes, change),
						texts(rec.before),
						outcomes,
					);
				if (flagged) {
					count(name, `diverged: ${flagged}`);
					return;
				}
				expect(outcomes.actual).toEqual(outcomes.expected);
			} catch (error) {
				count(name, "FAIL");
				throw error;
			}
			count(name, "pass");
		});
	}
});
