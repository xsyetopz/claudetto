export const BASELINE_TOTAL = 46_105;

export const BASELINE_TOOL_COUNT = 12;

export const BASELINE_TOOLS = 29_512;

export interface DenyReading {
	readonly name: string;
	readonly chars: number;
	readonly total: number;
	readonly tools: number;
}

/** Each `chars` is one less than its `tools` difference, because a definition travels with a comma. */
export const DENIED_TOOLS: readonly DenyReading[] = [
	{ name: "Workflow", chars: 5355, total: 40_749, tools: 24_156 },
	{ name: "ScheduleWakeup", chars: 4886, total: 41_218, tools: 24_625 },
	{ name: "ReportFindings", chars: 2177, total: 43_927, tools: 27_334 },
];

export const DENIED_TOGETHER_TOTAL = 33_684;

export const DENIED_TOGETHER_TOOLS = 17_091;

export interface NeverDenyReading {
	readonly name: string;
	readonly chars: number;
	readonly why: string;
}

export const NEVER_DENY: readonly NeverDenyReading[] = [
	{
		name: "ToolSearch",
		chars: 36_922,
		why: "the deny loads every deferred tool into the request",
	},
	{
		name: "Skill",
		chars: 8720,
		why: "the deny moves the workflow guidance into the `Workflow` definition",
	},
	{ name: "Bash", chars: -407, why: "the deny removes the shell" },
];

export interface DroppedDeny {
	readonly names: readonly string[];
	readonly total: number;
	readonly tools: number;
}

/** The second row is a deferred tool: its 12 characters are only a name in the deferred list. */
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
		total: 46_105,
		tools: 29_512,
	},
	{ names: ["DesignSync"], total: 46_093, tools: 29_512 },
];

export const denyList = (): readonly string[] =>
	DENIED_TOOLS.map((entry) => entry.name);

export const denyFaults = (names: readonly string[]): readonly string[] =>
	NEVER_DENY.filter((entry) => names.includes(entry.name)).map(
		(entry) => `${entry.name} must not be denied: ${entry.why}.`,
	);
