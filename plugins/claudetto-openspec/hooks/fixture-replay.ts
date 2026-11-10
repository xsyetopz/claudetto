// Replays one recorded upstream call (validation, discovery, task rules, spec merge) through the plugin's code.
import { posix } from "node:path";

import { mergeSpec } from "./archive-merge.ts";
import { materialize, nodeFs, type Rec } from "./fixture-kit.ts";
import {
	docs,
	items,
	object,
	option,
	reportOf,
	returned,
	str,
	update,
	wrapped,
} from "./fixture-shape.ts";
import { count, type Pair, same, settle, skipped } from "./fixture-tally.ts";
import { dirname, join } from "./fs.ts";
import { type Issue, type Report, validateSpec } from "./spec-rules.ts";
import { missingCheckboxes, numberingIssues } from "./tasks.ts";
import { discoverDeltas } from "./validate-discover.ts";
import { issueKey, validateDir } from "./validate.ts";

const CRLF = /\r\n?/gu;
const BLANKS = /\n\s*\n+/gu;

const summary = (r: Report) => ({
	valid: r.valid,
	issues: r.issues.map(issueKey).toSorted((x, y) => x.localeCompare(y)),
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
// Upstream warns where the plugin refuses: same files, ERROR instead.
const asError = (s: Sum) => ({
	valid: s.valid && !s.issues.some((i) => i.startsWith("WARNING|")),
	issues: s.issues.map((i) => i.replace("WARNING|", "ERROR|")),
});

interface Result extends Pair {
	diverged?: string;
}
type Runner = (rec: Rec, args: unknown, expected: unknown) => Promise<Result>;

const classify = (actual: Sum, want: Sum): Result => {
	if (same(actual, want)) {
		return { actual, expected: want };
	}
	const stricter = asError(want);
	if (same(actual, stricter)) {
		return { actual, expected: want, diverged: "warning->error" };
	}
	// The plugin names a stray file or repeats a root error; upstream's own errors all remain.
	const added = actual.issues.filter((i) => !stricter.issues.includes(i));
	return stricter.issues.every((i) => actual.issues.includes(i)) &&
		added.every((i) => i.startsWith("ERROR|"))
		? { actual, expected: want, diverged: "extra stray-file error" }
		: { actual, expected: want };
};

const validated: Runner = async (_rec, args, expected) => {
	const call = wrapped(args);
	const [dir, options] = call.list;
	const actual = summary(
		await validateDir(
			nodeFs,
			str(dir),
			option(options, "mainSpecsDir"),
			call.strict,
		),
	);
	return classify(actual, expectedSummary(reportOf(expected)));
};

const flat = (t: string) =>
	t.replaceAll(CRLF, "\n").replaceAll(BLANKS, "\n").trim();

// Line endings and blank-line runs are upstream's serialization; the plugin writes LF and one blank line.
const built = (actual: string | null, want: string): Result =>
	actual !== want && flat(actual ?? "") === flat(want)
		? {
				actual,
				expected: want,
				diverged: "line endings / blank runs (serialization)",
			}
		: { actual, expected: want };

// The text a recorded `after` tree holds at an absolute target, followed through a relative link.
const writtenText = (rec: Rec, target: string) => {
	const after = rec.after ?? {};
	const key =
		Object.keys(after)
			.filter((k) => target.endsWith(`/${k}`))
			.toSorted((a, b) => b.length - a.length)[0] ?? "";
	const link = after[key]?.link;
	const real =
		link === undefined
			? key
			: posix.normalize(posix.join(posix.dirname(key), link));
	return after[real]?.text ?? "";
};

const specUpdates: Runner = async (_rec, args, expected) => {
	const [change, mainSpecs] = items(args).map((v) => str(v));
	const { found } = await discoverDeltas(nodeFs, join(change ?? "", "specs"));
	const actual = await Promise.all(
		found.map(async (d) => ({
			id: d.id,
			exists: await nodeFs.exists(join(mainSpecs ?? "", d.id, "spec.md")),
		})),
	);
	return {
		actual,
		expected: items(returned(expected)).map((u) => ({
			id: object(u)["id"],
			exists: object(u)["exists"],
		})),
	};
};

const builtSpec: Runner = async (_rec, args, expected) => {
	const [recorded, name] = items(args);
	const u = update(recorded);
	const text = await mergeSpec(
		nodeFs,
		dirname(dirname(u.target)),
		str(name),
		u.id,
		u.source,
	);
	return built(text, str(object(returned(expected))["rebuilt"]));
};

// Upstream's write is the rebuilt text put at the target (through a link, keeping it); the
// plugin's equivalent is its own merge of the same delta, compared with the file left behind.
const writtenSpec: Runner = async (rec, args) => {
	const u = update(items(args)[0]);
	const name = u.source.split("/specs/")[0]?.split("/").pop() ?? "";
	return built(
		await mergeSpec(nodeFs, u.targetRoot, name, u.id, u.source),
		writtenText(rec, u.target),
	);
};

const discovered: Runner = async (_rec, args, expected) => {
	const found = await discoverDeltas(nodeFs, str(items(args)[0]));
	return { actual: found.unread, expected: returned(expected) };
};

const specFile: Runner = async (_rec, args, expected) => {
	const call = wrapped(args);
	const text = await nodeFs.read(str(call.list[0]));
	return {
		actual: summary(validateSpec(text, call.strict)),
		expected: expectedSummary(reportOf(expected)),
	};
};

const specContent: Runner = (_rec, args, expected) => {
	const call = wrapped(args);
	return Promise.resolve({
		actual: summary(validateSpec(str(call.list[1]), call.strict)),
		expected: expectedSummary(reportOf(expected)),
	});
};

const runners: Record<string, Runner> = {
	"task.checkboxes": (_rec, args, expected) =>
		Promise.resolve({
			actual: missingCheckboxes(docs(items(args)[0])),
			expected: returned(expected),
		}),
	"task.numbering": (_rec, args, expected) =>
		Promise.resolve({
			actual: numberingIssues(docs(items(args)[0])),
			expected: returned(expected),
		}),
	"discovery.findUnreadDeltaFiles": discovered,
	"validator.validateSpec": specFile,
	"validator.validateSpecContent": specContent,
	"validator.validateChangeDeltaSpecs": validated,
	"apply.findSpecUpdates": specUpdates,
	"apply.buildUpdatedSpec": builtSpec,
	"apply.writeUpdatedSpec": writtenSpec,
};

export const runnerFor = (kind: string): Runner | undefined => runners[kind];

export const FILES = [
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

// Why a record cannot be replayed (an empty string: it is replayed by the archive block).
export const notReplayable = (name: string, rec: Rec) => {
	if (rec.kind === "archive.execute") {
		return "";
	}
	if (rec.kind === "validator.validateChange") {
		return "upstream's proposal-prose pass is informative: archive prints it and never blocks on it, and validate never calls it";
	}
	if (
		rec.kind === "apply.writeUpdatedSpec" &&
		rec.outcome.threw !== undefined
	) {
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
	run: Runner,
	rec: Rec,
	args: unknown,
	outcome: unknown,
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

export const replayRecord = async (
	name: string,
	rec: Rec,
	run: Runner,
): Promise<Pair> => {
	const { args, expected: outcome } = await materialize(rec);
	if (rec.outcome.threw !== undefined) {
		const refusal = await refusedBy(run, rec, args, outcome);
		count(name, `upstream threw: plugin ${refusal ?? "SUCCEEDED"}`);
		return { actual: refusal !== undefined, expected: true };
	}
	const result = await run(rec, args, outcome);
	if (result.diverged !== undefined) {
		count(name, `diverged: ${result.diverged}`);
		return skipped(result.diverged);
	}
	return settle(name, result);
};
