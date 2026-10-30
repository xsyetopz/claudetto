// The numbers below are the readings of `just capture` on Claude Code `2.1.312`, written out in
// `docs/surfaces.md`.
//
// Every total was re-read on 2026-10-30 after `just inventory` reported the `baseline` and `deny
// list` rows stale by 192 characters each. The cause is the engine and not this tree: the third
// `system` block of the `plain` arm, which loads no plugin, grew from 5,628 to 5,818 characters under
// an unchanged `2.1.312`, and those 190 raw characters cost 192 on the wire once JSON escapes them.
// `tools` and `messages` did not move at all, which is why every `chars` and every `tools` figure
// below is the earlier reading and only the totals changed.

/** The total characters of the first request with the defaults (`docs/surfaces.md`). */
export const BASELINE_TOTAL = 42_879;

/** The characters of the `tools` array of that same baseline request. */
export const BASELINE_TOOLS = 28_187;

/** One capture run that denied a single tool name, with the request totals it read. */
export interface DenyReading {
	/** The tool name, as `permissions.deny` takes it. */
	readonly name: string;
	/** The characters this tool's own definition costs in the baseline request. */
	readonly chars: number;
	/** The total of the first request with this one name denied and nothing else changed. */
	readonly total: number;
	/** The `tools` characters of that same run. */
	readonly tools: number;
}

/**
 * The deny list claudetto writes. Each row is one `just capture --arm plain --deny <name>` run,
 * re-read on 2026-10-30, and in every row `system` stayed at 5,954 and `messages` at 8,061, so the
 * whole fall is the definition that left. The three are additive to the character: 5,356, 4,632, and
 * 2,178 of `tools` sum to the 12,166 that `DENIED_TOGETHER_TOTAL` reads, and each row's `chars` is
 * the per-tool reading of 2026-10-28, which is one less than its `tools` difference because the
 * definition travels with a comma.
 *
 * What each deny costs in capability, because a size lever that removes a capability is the user's
 * decision and not ours: `Workflow` is Dynamic Workflows, which this project does not use because it
 * works in worktrees; `ScheduleWakeup` is the autonomous
 * `/loop` and the session crons that `session_crons` of the `Stop` input reports, and claudetto's
 * own goal loop does not use it; `ReportFindings` renders code-review findings in a host UI, and the
 * `/code-review` text itself tells the model not to use it unless the active instructions ask for it.
 */
export const DENIED_TOOLS: readonly DenyReading[] = [
	{ name: "Workflow", chars: 5355, total: 37_523, tools: 22_831 },
	{ name: "ScheduleWakeup", chars: 4631, total: 38_247, tools: 23_555 },
	{ name: "ReportFindings", chars: 2177, total: 40_701, tools: 26_009 },
];

/** The total of the one run that denied all three names together. */
export const DENIED_TOGETHER_TOTAL = 30_713;

/** The `tools` characters of that same run, which carried 9 definitions. */
export const DENIED_TOGETHER_TOOLS = 16_021;

/** A tool name whose denial raised the first request, with the growth in characters and the earlier reading in tokens. */
export interface RaiseReading {
	readonly name: string;
	/** The characters the first request gains when this name is denied, read on `2.1.312`. */
	readonly chars: number;
	/** The tokens the reading of 2026-10-27 measured. */
	readonly tokens: number;
}

/**
 * The names that must never be denied, because denying them raises the request. Re-read on
 * 2026-10-30, each as one `just capture --arm plain --deny <name>` run: denying `ToolSearch` loads
 * all 20 deferred tools (42,879 to 74,620), denying `Skill` moves the workflow guidance into the
 * `Workflow` definition and grows `tools` from 28,187 to 43,338 (to 51,949), and denying `Bash` puts
 * `Grep` and `Glob` in its place (to 43,785). The token figures are the earlier readings of
 * 2026-10-27, and the per-tool figure for the swollen `Workflow`, 22,310 characters, is the
 * 2026-10-28 reading of `docs/surfaces.md`, which this run did not take again.
 *
 * `Skill` is the one row with a second route to the same text: `disableBundledSkills` empties the
 * skill listing without denying the tool, and `../builtins.ts` measures the identical swell, `tools`
 * at 45,142. So the rule here is about the tool and the key alike, and the key is a cut only once
 * `Workflow` is denied.
 */
export const NEVER_DENY: readonly RaiseReading[] = [
	{ name: "ToolSearch", chars: 31_741, tokens: 15_898 },
	{ name: "Skill", chars: 9070, tokens: 5599 },
	{ name: "Bash", chars: 906, tokens: 384 },
];

/** One capture run that backs the removal of names from the archived deny list. */
export interface DroppedDeny {
	/** The names of one run, which the archived snippet denied and this tree does not. */
	readonly names: readonly string[];
	/** The total of that run. */
	readonly total: number;
	/** The `tools` characters of that run, which equal the baseline when no definition left. */
	readonly tools: number;
}

/**
 * The names the archived snippet denied that no capture supports, each with the run that drops it.
 * The first row changes nothing at all. The second is a deferred tool, so its 12 characters are its
 * name in the deferred-tool list of `messages` and never a definition, so denying it is no size
 * lever.
 */
export const DROPPED_DENIES: readonly DroppedDeny[] = [
	{
		names: [
			"Artifact",
			"RemoteTrigger",
			"TaskCreate",
			"TaskGet",
			"TaskList",
			"TaskUpdate",
			"mcp__computer-use",
		],
		total: 42_879,
		tools: 28_187,
	},
	{ names: ["DesignSync"], total: 42_867, tools: 28_187 },
];

const chars = (value: number): string => value.toLocaleString("en-US");

/** The tool names claudetto writes into `permissions.deny`. */
export const denyList = (): readonly string[] =>
	DENIED_TOOLS.map((entry) => entry.name);

/**
 * The fault in a deny list, one line per name whose removal was measured to raise the request. An
 * empty list is a list that may ship.
 */
export const denyFaults = (names: readonly string[]): readonly string[] =>
	NEVER_DENY.filter((entry) => names.includes(entry.name)).map(
		(entry) =>
			`${entry.name} must not be denied: its removal raises the first request by ${chars(entry.chars)} characters on 2.1.312 and by +${chars(entry.tokens)} tokens in the reading of 2026-10-27.`,
	);
