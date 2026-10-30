// A shorter request is not a saving on its own. `docs/surfaces.md` cites a study that removed 38.4%
// of delivered tool-output tokens and raised billed cost by 6.8%, with a Pearson r of 0.15 between
// the two, so the character score and the bill are different measurements and the bill is the one
// that decides. This module keeps them apart: `chars` is what the capture read, `cost` is what a
// bill reading says, and a cut with no `cost` may be reported as a shorter request, not as a saving.

import { BUILTIN_CHARS } from "./builtins.ts";
import { BASELINE_TOTAL, DENIED_TOGETHER_TOTAL } from "./deny.ts";

/** A bill reading of a cut, kept apart from the character count because the two are different measurements. */
export interface CostReading {
	/** The change in billed cost, in percent, where a negative number is cheaper. */
	readonly shift: number;
	/** The page the reading is written on. */
	readonly source: string;
}

/** One piece of the fall from the baseline first request to the shipped one, with its character count and, where one exists, its bill reading. */
export interface Cut {
	readonly name: string;
	/**
	 * Characters off the first request, 0 for a cut that changes no request text, and a negative
	 * number for a piece the tree adds, so that the inventory still accounts for the whole fall.
	 */
	readonly chars: number;
	/** The bill reading, or none when no reading exists yet. */
	readonly cost?: CostReading;
}

/**
 * The first request of the shipped `plugin` arm, read by `just capture --shipped` on 2026-10-30. It
 * was 30,462 on 2026-10-29 and `just inventory` found the difference, which is the drift that check
 * exists for. It moved three more times the same day. Texts for `Edit`, `ListAgents`, and `Write`
 * joined `tools/texts.ts` and took 30,450 to 30,291, with the `tools` array carrying the whole 159,
 * 13,009 to 12,850. Then the two switches of `builtins.ts` took 30,291 to 24,378, every character of
 * it out of `messages`. Then the `dedupe` skill landed and put 229 back, for 24,607.
 *
 * The 24,607 was a figure of no user's session: `shippedSettings` composed its own list and carried
 * `permissions.deny`, `agent`, and `outputStyle`, which `tierSnippet` did not write. It now derives
 * from `planSetup`, and wiring those keys in moved the reading to 31,861. Then `commands/setup.md`
 * shipped and its row in the command listing put 48 back, for 31,909. Every reading of 31,861 in the
 * rows below is of the arm before that command existed, which leaves each difference between two such
 * readings sound, because the row is in both arms of each pair.
 */
export const SHIPPED_TOTAL = 31_909;

/**
 * The cuts of the shipped `plugin` arm, including the pieces the tree adds, which carry a negative
 * `chars`, so that `shippedChars` sums to the whole fall.
 *
 * Every row is a whole-request figure read from one set of captures, re-taken on 2026-10-30 after the
 * built-in switches and the `dedupe` skill moved the arm, so the rows add up: the arm with each piece
 * in place reads 24,607, with `Artemis.md` and `Athena.md` moved aside 24,127, with `output-styles/`
 * moved aside 22,914, with both of those moved aside 22,434, and with `agents/main.md` moved aside
 * 24,866. The additivity is read and not assumed: 480 for the agent files plus 1,693 for the style is
 * the 2,173 that separates the full arm from the both-aside arm, the same 2,173 as the earlier set.
 * Each figure is the difference from the full arm, which is the only comparison the readings support;
 * the difference from the row above, which `docs/prompt/footprint.md` used to ask for, prices the
 * style at 1,213 instead.
 *
 * Only one row moved in the re-reading, `main agent body`, and the engine moved it rather than this
 * tree: the default body the plugin arm sends grew 5,666 to 5,856 characters, while `agents/main.md`
 * held at 5,572, so the same file now replaces 284 raw characters instead of 94.
 */
export const SHIPPED_CUTS: readonly Cut[] = [
	{ name: "deny list", chars: BASELINE_TOTAL - DENIED_TOGETHER_TOTAL },
	// The one row no isolating capture reaches, because hiding our tool texts means hiding the plugin
	// itself, so this is the residual of the shipped reading once every other piece is measured. The
	// direct reading of the `tools` array puts the same cut at 3,171, 16,021 in the deny arm against
	// 12,850 in this one, so the direct reading carries 27 characters the residual does not. That 27 is
	// the same figure that separates the main agent body's 94 raw characters from its 67 on the wire,
	// which is JSON escaping; whether it is that same term or a coincidence of two readings is not
	// settled by these captures, so the residual is named as the plug and not as a measurement. The 27
	// held across the trims of 2026-10-30, which moved both readings by the same 159, and across the
	// switches and the skill of the same day, which moved neither: both land in `messages`.
	{ name: "tool texts", chars: 3144 },
	// The two switches of `builtins.ts`, which remove Claude Code's bundled skills and its built-in
	// plugins. The whole 5,913 leaves `messages`, 11,029 to 5,116, while `tools` holds at 12,850 and
	// `system` at 5,708, so this row takes nothing that another row also counts. It is the largest
	// single cut after the deny list, and it is a cut only because of that deny list: with `Workflow`
	// still offered, `disableBundledSkills` moves the workflow guidance into the tool definition and
	// raises the request by 11,379 instead (`builtins.ts`, `BUILTIN_CUTS`).
	{ name: "built-in surface", chars: BUILTIN_CHARS },
	// The one skill the tree ships, so the listing it removed above is not empty of ours. A listed
	// skill costs its name, its description, and the markup around them: 24,378 against 24,607 read
	// minutes apart, which is 229 and not the 171 that counting the parts predicts. It is a cost and
	// not a cut, so the sign is negative.
	{ name: "dedupe skill", chars: -229 },
	// The percentage and the window move no request text at all: the reading of the shipped
	// combination is character-identical to the deny-only reading. What they move is the bill, which
	// the threshold replay priced.
	{
		name: "compaction pair",
		chars: 0,
		cost: { shift: -14.2, source: "docs/evidence/compaction/threshold.md" },
	},
	// `idleCompaction: false` changes no request text either, and its evidence is the gap rows rather
	// than a bill reading.
	{ name: "idleCompaction off", chars: 0 },
	// The harness sends the body of `agents/main.md`, 5,572 characters, in place of the default body the
	// plugin arm sends, which the arm with the file moved aside reads at 5,856. The request falls 259
	// and not the raw 284, because the body travels as a JSON string and ours escapes characters the
	// default text does not. This row was 67 against a default body of 5,666, and the 190 of difference
	// is the engine's: the default body grew under an unchanged `2.1.312` while our file did not move,
	// so the same file now earns a larger cut. The row below is the 38 characters that separate the
	// plugin arm's default body from the `plain` arm's. That escaping is also why the file's bound is
	// 5,680 request characters rather than a figure in characters.
	{ name: "main agent body", chars: 259 },
	// The plugin's own presence lengthens the third system block before any file of ours replaces it:
	// the `plain` arm sends a default body of 5,818 and the `plugin` arm with `agents/main.md` moved
	// aside sends 5,856. The inventory had no row for those 38 characters, and the chain from the
	// baseline through every other measured step lands 65 short of the reading without it. It is a cost
	// and not a cut, so the sign is negative. The 38 held across the engine's growth of 190, which
	// moved both bodies by the same amount. What the plugin adds there is not read: these captures
	// give the length of the block and not its text.
	{ name: "plugin system text", chars: -38 },
	// The harness names each custom agent in the agent listing of the first message, with its
	// description and its tools. `src/register.ts` refuses the offer for `claudetto:main`, a type no
	// session delegates to, but `Artemis` and `Athena` are delegation targets and are listed. Their
	// two entries cost 480 characters, 24,607 with the two files present against 24,127 with both moved
	// aside. This row was 492 against the 30,462 the arm read on 2026-10-29, and the 12 of difference
	// left the `tools` array: 13,021 then and 13,009 now, while the moved-aside arm reads 13,009 on both
	// dates, so the 12 were the roster's contribution to the `ListAgents` description and the roster no
	// longer reaches it. This row was 0 while `main` was the only agent file and the refusal emptied the
	// listing; it is a cost now because the roster ships.
	{ name: "agent listing", chars: -480 },
	// The handoff context block of `src/handoff.ts` goes into the first user message as a
	// `<system-reminder>` of 733 characters, which costs 770 on the wire: re-serializing the captured
	// body without that content part gives 23,837 against 24,607. The inventory had no row for it,
	// which is most of why its total had drifted 1,382 characters from the reading.
	{ name: "handoff context", chars: -770 },
	// A style adds to the body instead of replacing it, so this row is a cost and not a cut: the
	// harness puts the body of `output-styles/Concise.md`, 1,526 characters, into the first message
	// under a header, and appends a reminder that repeats on each user message. Moving the folder aside
	// reads 28,757 against 30,450, so the three together cost 1,693. The 28,757 holds on both dates and
	// this row was 1,705 against the 30,462 of 2026-10-29, which is the same 12 characters the agent
	// listing shed and not a second change: they are two differences against one total that moved.
	{ name: "output style", chars: -1693 },
	// The four `autoMode` lists cost the first request nothing: the arm with the block and the arm
	// without it both read 31,861. The classifier reads them, so the classifier call is where they are
	// paid, and `M12` counts those.
	{ name: "autoMode lists", chars: 0 },
	// Dropping the `sandbox` block reads 24,607 against 31,861, so it costs 7,254: 832 in `tools` and
	// 6,422 in `messages`, the guidance the harness injects once the sandbox is on. Still the cheaper
	// side of its own trade: `how-it-works/permission-flow` puts sandbox auto-allow among the allow
	// sources, which are checked before the mode reaches the classifier, so a sandboxed `Bash` call
	// never pays the 140,718 characters of one classifier call (`docs/prompt/machinery.md`). It stays
	// unpriced until the `classifier` rows of `window-budget` count the calls avoided.
	{ name: "sandbox block", chars: -7254 },
	// `commands/setup.md` puts one row in the command listing of the first message, with its name and
	// its description, so the model is told the command exists. It is a cost and not a cut: the arm
	// read 31,909 with the file and 31,861 with it moved aside. Nothing else of the command reaches a
	// request, because `tiers/hooks.ts` answers it with `text` alone and no `context`. The description
	// is one short sentence for this reason: the first wording of it read 31,961.
	{ name: "setup command listing", chars: -48 },
];

/**
 * The most characters the budget line of `run-limits/budget.ts` can take, with all three readings at
 * their widest: `Budget: context 100% left, five-hour 99.9% used, seven-day 99.9% used`. It rides the
 * `context` of `prompt.submit`, so it costs no request of its own and is not a row of `SHIPPED_CUTS`:
 * a capture of the first request carries no `Budget:` text, because the session has no usage reading
 * to report yet. It was on `additionalContext` of `classic.Stop` until 2026-10-30, where it cost 8
 * extra model requests a turn, the cap of `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`.
 */
export const BUDGET_LINE_MAX_CHARS = 69;

/** The characters the shipped cuts take off the first request, added up. */
export const shippedChars = (cuts: readonly Cut[] = SHIPPED_CUTS): number => {
	let total = 0;
	for (const cut of cuts) {
		total += cut.chars;
	}
	return total;
};

/**
 * The cuts that may be reported as a saving: those with a reading that shows the bill did not rise.
 * A cut with no reading is not in it, however many characters it takes off.
 */
export const pricedCuts = (
	cuts: readonly Cut[] = SHIPPED_CUTS,
): readonly Cut[] =>
	cuts.filter((cut) => cut.cost !== undefined && cut.cost.shift <= 0);

/** The cuts that still have no bill reading, which is what `docs/surfaces.md` has to say per cut. */
export const unpricedCuts = (
	cuts: readonly Cut[] = SHIPPED_CUTS,
): readonly string[] =>
	cuts.filter((cut) => cut.cost === undefined).map((cut) => cut.name);

/**
 * The cuts a reading has turned down: the score fell and the bill rose. Such a cut is reverted, so
 * this list is the one that has to stay empty in a shipped tree.
 */
export const risingCuts = (
	cuts: readonly Cut[] = SHIPPED_CUTS,
): readonly string[] =>
	cuts
		.filter((cut) => cut.cost !== undefined && cut.cost.shift > 0)
		.map((cut) => cut.name);
