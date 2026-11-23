import type { EngineInterface } from "claude-code";

import { SPECS_DIR } from "../texts";
import { gather, gitOut, LIST_ARGV, readAll } from "./gather";
import { type HardFinding, hardFindings } from "./hard";
import { parseSpec } from "./parse";
import { isSpecFile, isTestFile, listPaths } from "./paths";
import { type CheckInput, checkSpecs, type Report } from "./spec";
import { compareTest } from "./tamper";

/**
 * The repo as the session found it, so the Stop gate charges the agent only with its own
 * changes. A user's uncommitted spec edit or unstaged test edit predates the session and
 * is the user's work, not drift (RISK-519).
 */
export interface Baseline {
	/** Each spec file's work-tree text at session start. */
	specs: Record<string, string>;
	/** Each test file that differed from the index at start: its text, or null when deleted. */
	tests: Record<string, string | null>;
	/** `kind subject` of each malformed or orphan finding the start state already had. */
	known: string[];
}

/** The session-held baseline; `$.state` needs the reference as a const of the file that uses it. */
const BASELINE = { plugin: "claudetto-spec", key: "baseline" } as const;

/** A finding's identity across the start and Stop checks. */
function keyOf(f: HardFinding): string {
	return `${f.kind} ${f.subject}`;
}

/**
 * Reads the start state: test files the work tree changed against the index, and, in a
 * repo with `specs/`, every spec text and the malformed and orphan findings already there.
 *
 * @param $ The engine interface.
 * @returns The baseline, or `undefined` outside a git work tree.
 */
export async function takeBaseline(
	$: EngineInterface
): Promise<Baseline | undefined> {
	const listed = await $.process.run(LIST_ARGV);
	if (listed.exitCode !== 0) {
		return undefined;
	}
	const diff = listPaths(await gitOut($, ["diff", "--name-only"])).filter((p) =>
		isTestFile(p)
	);
	const texts = await readAll($, diff);
	const tests = Object.fromEntries(diff.map((p) => [p, texts.get(p) ?? null]));
	if (!(await $.fs.exists(SPECS_DIR))) {
		return { specs: {}, tests, known: [] };
	}
	const input = await gather($, listed.stdout);
	const specs = Object.fromEntries(
		[...input.texts].filter(([p]) => isSpecFile(p))
	);
	return {
		specs,
		tests,
		known: hardFindings(checkSpecs({ ...input, path: undefined }))
			.filter((f) => f.kind === "malformed" || f.kind === "orphan")
			.map((f) => keyOf(f))
	};
}

/** The check input with each spec compared to its session-start text in place of HEAD's. */
export function sinceStart(
	input: Omit<CheckInput, "path">,
	base: Baseline
): Omit<CheckInput, "path"> {
	return {
		...input,
		head: new Map([...(input.head ?? []), ...Object.entries(base.specs)])
	};
}

/** False for a finding the start state already had, so the user, not the agent, made it. */
function isNew(
	f: HardFinding,
	base: Baseline,
	texts: ReadonlyMap<string, string>
): boolean {
	if (f.kind === "malformed" || f.kind === "orphan") {
		return !base.known.includes(keyOf(f));
	}
	if (f.kind !== "tampered" || !(f.subject in base.tests)) {
		return true;
	}
	const start = base.tests[f.subject];
	const now = texts.get(f.subject);
	if (start === null || start === undefined) {
		// Deleted before the session: only a file the session wrote back counts.
		return now !== undefined;
	}
	return now === undefined || compareTest(f.subject, start, now) !== undefined;
}

/**
 * The findings the session itself caused.
 *
 * @param found The hard findings of the Stop check, run with `sinceStart`.
 * @param base The session-start baseline.
 * @param texts Work-tree text by path, as the Stop check read it.
 */
export function newFindings(
	found: HardFinding[],
	base: Baseline,
	texts: ReadonlyMap<string, string>
): HardFinding[] {
	return found.filter((f) => isNew(f, base, texts));
}

/**
 * A `spec_check` report limited to the session's own drift and tampering, so the agent
 * reads the user's pre-session spec edits as the spec to implement, not as drift.
 *
 * @param input The gathered check input.
 * @param base The session-start baseline.
 * @param path The optional spec path the report is limited to.
 * @returns The report, with specs compared to their start text and tamper entries the start already had dropped.
 */
export function sessionReport(
	input: Omit<CheckInput, "path">,
	base: Baseline,
	path: string | undefined
): Report {
	const report = checkSpecs({ ...sinceStart(input, base), path });
	return {
		...report,
		tampered: report.tampered.filter((t) =>
			isNew(
				{ kind: "tampered", subject: t.file, message: "" },
				base,
				input.texts
			)
		)
	};
}

/** The behaviour sentence `id` had at session start, if a start spec defines it. */
export function startWording(base: Baseline, id: string): string | undefined {
	for (const [file, text] of Object.entries(base.specs)) {
		const wording = parseSpec(file, text).behaviours.get(id);
		if (wording !== undefined) {
			return wording;
		}
	}
	return undefined;
}

/** Takes and stores the baseline; a failure is logged and the gate falls back to HEAD. */
export async function recordBaseline($: EngineInterface): Promise<void> {
	try {
		const base = await takeBaseline($);
		if (base !== undefined) {
			await $.state.set(BASELINE, base);
		}
	} catch {
		$.ui.log("claudetto-spec: baseline failed", { to: "debug" });
	}
}

/** The session-start baseline, or `undefined` when none was taken. */
export async function readBaseline(
	$: EngineInterface
): Promise<Baseline | undefined> {
	const read = await $.state.get(BASELINE);
	return read.value;
}
