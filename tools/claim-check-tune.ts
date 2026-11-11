// Tunes the claim-check thresholds offline from the files a claim-check run saved. It reads the payload folder and the cases file, makes no request, and prints:
// the share of Nouls inside the unsettled band, the fallback's exact-match score on cases with a band Noul, and the `noMax` and `yesMin` pair that maximizes case-level exact match, next to the score at today's values.
// Usage: bun tools/claim-check-tune.ts <payload-folder> <cases.jsonl>
// The fallback saw only the Nouls that were in today's band, so a Noul that a wider band would send to it counts as `unsettled`; a narrower band than today's is scored exactly.
import { file, Glob } from "bun";

import {
	CLAIM_CHECK,
	type ClaimFault,
	claimState,
	faultsOf,
	noulsFor,
} from "../plugins/claudetto/hooks/decider/claim-check.ts";
import { readReply } from "../plugins/claudetto/hooks/decider/fallback.ts";
import {
	type Answers,
	UNSETTLED,
} from "../plugins/claudetto/hooks/decider/questions.ts";
import { isRecord } from "../plugins/claudetto/hooks/tools.ts";
import { ALL, asCase } from "./claim-check-plugin/hooks/score.ts";
import { fail, field, lines } from "./claim-check-prices.ts";
import { matches } from "./claim-check-report.ts";

type Case = ReturnType<typeof asCase>;

interface Saved {
	/** The Noul probabilities Jev gave, when it answered every Noul asked. */
	readonly jev: Readonly<Record<string, number>> | undefined;
	/** The fallback's raw reply; empty when it gave none. */
	readonly reply: string | undefined;
}

const firstFile = async (
	dir: string,
	pattern: string,
): Promise<string | undefined> => {
	const found = await Array.fromAsync(new Glob(pattern).scan(dir));
	return found[0] === undefined ? undefined : `${dir}/${found[0]}`;
};

const probabilitiesOf = (
	jev: unknown,
	names: readonly string[],
): Record<string, number> | undefined => {
	if (field(jev, "status") !== 200) {
		return undefined;
	}
	const answers: unknown = field(
		JSON.parse(String(field(jev, "text"))),
		"answers",
	);
	const ps = names.map((name) =>
		field(isRecord(answers) ? answers[name] : undefined, "noul"),
	);
	return ps.every((p) => typeof p === "number" && p >= 0 && p <= 1)
		? Object.fromEntries(names.map((name, i) => [name, Number(ps[i])]))
		: undefined;
};

const savedOf = async (dir: string, c: Case): Promise<Saved | undefined> => {
	const jevFile = await firstFile(dir, `${c.id}.decider-jev.*.response.json`);
	const replyFile = await firstFile(
		dir,
		`${c.id}.decider-fallback.*.response.json`,
	);
	if (jevFile === undefined && replyFile === undefined) {
		return undefined;
	}
	const reply: unknown =
		replyFile === undefined ? undefined : await file(replyFile).json();
	const jev: unknown =
		jevFile === undefined ? undefined : await file(jevFile).json();
	return {
		jev: probabilitiesOf(jev, noulsFor(c.codes)),
		reply:
			field(reply, "isAnswered") === true ? String(field(reply, "text")) : "",
	};
};

const answerOfP = (p: number, noMax: number, yesMin: number): string => {
	if (p >= yesMin) {
		return "yes";
	}
	return p <= noMax ? "no" : UNSETTLED;
};

const fallbackAnswers = (
	c: Case,
	saved: Saved,
	names: readonly string[],
): Answers =>
	readReply(
		CLAIM_CHECK,
		claimState({ ...c.turn, reply: c.reply, tasks: c.tasks }),
		names,
		saved.reply ?? "",
	) ?? Object.fromEntries(names.map((name) => [name, UNSETTLED]));

/** The faults of a case under a pair of thresholds; a Noul in the band takes the fallback's answer unless `jevOnly`. */
const faultsAt = (
	c: Case,
	saved: Saved,
	band: { noMax: number; yesMin: number },
	jevOnly = false,
): ClaimFault[] => {
	const names = noulsFor(c.codes);
	const jev = saved.jev;
	if (jev === undefined) {
		return faultsOf(c.codes, fallbackAnswers(c, saved, names));
	}
	const at = (name: string, noMax: number, yesMin: number) =>
		answerOfP(jev[name] ?? 0, noMax, yesMin);
	const sentOnward = names.filter(
		(name) => at(name, CLAIM_CHECK.noMax, CLAIM_CHECK.yesMin) === UNSETTLED,
	);
	const onward = jevOnly ? {} : fallbackAnswers(c, saved, sentOnward);
	return faultsOf(
		c.codes,
		Object.fromEntries(
			names.map((name) => {
				const a = at(name, band.noMax, band.yesMin);
				return [name, a === UNSETTLED ? (onward[name] ?? UNSETTLED) : a];
			}),
		),
	);
};

type Scored = readonly { c: Case; saved: Saved }[];

const exactCount = (scored: Scored, band: Parameters<typeof faultsAt>[2]) =>
	scored.filter(({ c, saved }) =>
		matches(ALL, {
			id: c.id,
			expected: c.expected,
			found: faultsAt(c, saved, band),
		}),
	).length;

const percent = (part: number, whole: number): string =>
	whole === 0 ? "n/a" : `${((100 * part) / whole).toFixed(1)}%`;

const STEP = 0.05;
const GRID = Array.from(
	{ length: 19 },
	(_, i) => Math.round((i + 1) * 5) / 100,
);

/** How far a pair lies from today's values. */
const apart = (p: { noMax: number; yesMin: number }): number =>
	Math.abs(p.noMax - CLAIM_CHECK.noMax) +
	Math.abs(p.yesMin - CLAIM_CHECK.yesMin);

const bestPair = (scored: Scored) => {
	const pairs = GRID.flatMap((noMax) =>
		GRID.filter((yesMin) => yesMin > noMax).map((yesMin) => ({
			noMax,
			yesMin,
			hit: exactCount(scored, { noMax, yesMin }),
		})),
	);
	const top = Math.max(...pairs.map((p) => p.hit));
	const tied = pairs.filter((p) => p.hit === top);
	return { best: tied.toSorted((a, b) => apart(a) - apart(b))[0], tied };
};

const report = (cases: readonly Case[], scored: Scored): string[] => {
	const { noMax, yesMin } = CLAIM_CHECK;
	const inBand = (p: number) => p > noMax && p < yesMin;
	const answered = scored.filter(({ saved }) => saved.jev !== undefined);
	const ps = answered.flatMap(({ saved }) => Object.values(saved.jev ?? {}));
	const withBand = answered.filter(({ saved }) =>
		Object.values(saved.jev ?? {}).some((p) => inBand(p)),
	);
	const bandExact = exactCount(withBand, CLAIM_CHECK);
	const bandJevOnly = withBand.filter(({ c, saved }) =>
		matches(ALL, {
			id: c.id,
			expected: c.expected,
			found: faultsAt(c, saved, CLAIM_CHECK, true),
		}),
	).length;
	const { best, tied } = bestPair(scored);
	const todayHit = exactCount(scored, CLAIM_CHECK);
	const banded = ps.filter((p) => inBand(p)).length;
	const range = (pick: (p: { noMax: number; yesMin: number }) => number) =>
		`${Math.min(...tied.map((p) => pick(p)))} to ${Math.max(...tied.map((p) => pick(p)))}`;
	return [
		`Cases with saved answers: ${scored.length} of ${cases.length}; Jev answered every Noul in ${answered.length}.`,
		`Nouls inside the unsettled band (${noMax} < p < ${yesMin}): ${banded} of ${ps.length} (${percent(banded, ps.length)}).`,
		`Cases with a band Noul: ${withBand.length}. Fallback exact match on them: ${bandExact} of ${withBand.length} (${percent(bandExact, withBand.length)}); with the band left unsettled: ${bandJevOnly} of ${withBand.length}.`,
		`Exact match at today's values (noMax ${noMax}, yesMin ${yesMin}): ${todayHit} of ${scored.length} (${percent(todayHit, scored.length)}).`,
		best === undefined
			? "No pair scored."
			: `Best pair on a ${STEP} step: noMax ${best.noMax}, yesMin ${best.yesMin}: ${best.hit} of ${scored.length} (${percent(best.hit, scored.length)}); ${tied.length} pairs tie, noMax ${range((p) => p.noMax)}, yesMin ${range((p) => p.yesMin)}.`,
	];
};

const main = async (): Promise<number> => {
	const [dir, casesPath] = process.argv.slice(2);
	if (dir === undefined || casesPath === undefined) {
		return fail(
			"Usage: bun tools/claim-check-tune.ts <payload-folder> <cases.jsonl>",
		);
	}
	const text = await file(casesPath).text();
	const cases = lines(text).map((line) => asCase(line));
	const loaded = await Promise.all(
		cases.map(async (c) => ({ c, saved: await savedOf(dir, c) })),
	);
	const scored = loaded.flatMap(({ c, saved }) =>
		saved === undefined ? [] : [{ c, saved }],
	);
	if (scored.length === 0) {
		return fail("No case has saved answers in the payload folder.");
	}
	console.info(report(cases, scored).join("\n"));
	return 0;
};

try {
	process.exitCode = await main();
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
}
