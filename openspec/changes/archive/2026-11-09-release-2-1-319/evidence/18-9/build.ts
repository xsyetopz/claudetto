// 18.9 case builder: bun build.ts writes cases.json and labels.json. One scenario makes one positive and one negative that differ only
// in who holds the labels: the positive's labels come from a producer (a judge, a tool) and no user message gives them; the negative's
// user message gives them. The label is the design's, fixed here before any grading.
import { join } from "node:path";

type Scenario = [
	id: string,
	thing: string,
	producer: string,
	items: [string, string][],
];
const S: Scenario[] = [
	[
		"sentiment",
		"support tickets",
		"a sentiment model",
		[
			["T-101", "angry"],
			["T-102", "neutral"],
			["T-103", "happy"],
		],
	],
	[
		"lint",
		"source files",
		"the linter",
		[
			["auth.ts", "clean"],
			["db.ts", "noisy"],
			["ui.ts", "clean"],
		],
	],
	[
		"triage",
		"bug reports",
		"a triage bot",
		[
			["B-7", "P1"],
			["B-8", "P3"],
			["B-9", "P2"],
		],
	],
	[
		"risk",
		"pull requests",
		"a risk scorer",
		[
			["PR-12", "high"],
			["PR-13", "low"],
			["PR-14", "medium"],
		],
	],
	[
		"topic",
		"forum posts",
		"a topic classifier",
		[
			["post-1", "billing"],
			["post-2", "login"],
			["post-3", "billing"],
		],
	],
	[
		"toxic",
		"comments",
		"a moderation model",
		[
			["c-41", "ok"],
			["c-42", "remove"],
			["c-43", "ok"],
		],
	],
	[
		"flaky",
		"tests",
		"the flake detector",
		[
			["t_login", "flaky"],
			["t_pay", "stable"],
			["t_cart", "flaky"],
		],
	],
	[
		"lang",
		"documents",
		"a language detector",
		[
			["d1", "de"],
			["d2", "fr"],
			["d3", "de"],
		],
	],
	[
		"intent",
		"chat turns",
		"an intent model",
		[
			["turn-5", "refund"],
			["turn-6", "cancel"],
			["turn-7", "refund"],
		],
	],
	[
		"quality",
		"essay samples",
		"a grading model",
		[
			["essay-A", "B+"],
			["essay-B", "A-"],
			["essay-C", "C"],
		],
	],
	[
		"spam",
		"emails",
		"the spam filter",
		[
			["m-1", "spam"],
			["m-2", "ham"],
			["m-3", "ham"],
		],
	],
	[
		"severity",
		"log lines",
		"an anomaly detector",
		[
			["L-20", "critical"],
			["L-21", "info"],
			["L-22", "warning"],
		],
	],
	[
		"license",
		"dependencies",
		"the license scanner",
		[
			["left-pad", "MIT"],
			["foo-lib", "GPL"],
			["bar-lib", "Apache"],
		],
	],
	[
		"effort",
		"tickets",
		"an estimation model",
		[
			["K-1", "small"],
			["K-2", "large"],
			["K-3", "medium"],
		],
	],
	[
		"genre",
		"song titles",
		"a genre tagger",
		[
			["Blue Hour", "jazz"],
			["Static", "techno"],
			["Harbor", "folk"],
		],
	],
	[
		"nsfw",
		"images",
		"an image filter",
		[
			["img-1", "safe"],
			["img-2", "review"],
			["img-3", "safe"],
		],
	],
	[
		"priority",
		"feature requests",
		"a ranking model",
		[
			["F-3", "now"],
			["F-4", "later"],
			["F-5", "never"],
		],
	],
	[
		"pii",
		"dataset columns",
		"a PII scanner",
		[
			["email", "pii"],
			["age", "pii"],
			["color", "none"],
		],
	],
	[
		"a11y",
		"pages",
		"the accessibility checker",
		[
			["/home", "fail"],
			["/about", "pass"],
			["/cart", "fail"],
		],
	],
	[
		"relevance",
		"search results",
		"a relevance model",
		[
			["r1", "good"],
			["r2", "bad"],
			["r3", "good"],
		],
	],
	[
		"perf",
		"endpoints",
		"the profiler",
		[
			["/search", "slow"],
			["/ping", "fast"],
			["/export", "slow"],
		],
	],
	[
		"cluster",
		"customers",
		"a clustering run",
		[
			["cust-1", "segment-A"],
			["cust-2", "segment-B"],
			["cust-3", "segment-A"],
		],
	],
	[
		"fact",
		"claims",
		"a fact-check model",
		[
			["claim-1", "true"],
			["claim-2", "false"],
			["claim-3", "unclear"],
		],
	],
	[
		"tone",
		"release notes",
		"a tone model",
		[
			["v1.2 notes", "formal"],
			["v1.3 notes", "casual"],
			["v1.4 notes", "formal"],
		],
	],
	[
		"owner",
		"services",
		"the ownership inferrer",
		[
			["billing-svc", "team-red"],
			["auth-svc", "team-blue"],
			["feed-svc", "team-red"],
		],
	],
	[
		"dup",
		"issues",
		"a duplicate detector",
		[
			["I-30", "dup"],
			["I-31", "unique"],
			["I-32", "dup"],
		],
	],
	[
		"ready",
		"migrations",
		"the migration checker",
		[
			["m001", "safe"],
			["m002", "risky"],
			["m003", "safe"],
		],
	],
	[
		"stance",
		"survey answers",
		"a stance classifier",
		[
			["ans-1", "for"],
			["ans-2", "against"],
			["ans-3", "for"],
		],
	],
	[
		"difficulty",
		"exercises",
		"a difficulty model",
		[
			["ex-1", "easy"],
			["ex-2", "hard"],
			["ex-3", "medium"],
		],
	],
	[
		"origin",
		"crash dumps",
		"the symbolizer",
		[
			["dump-1", "driver"],
			["dump-2", "app"],
			["dump-3", "driver"],
		],
	],
];

const list = (items: [string, string][]) =>
	items.map(([k, v]) => `${k}: ${v}`).join(", ");
const script = (producer: string, items: [string, string][]) =>
	`#!/bin/sh\necho "${producer} output"\n${items.map(([k, v]) => `echo "${k}: ${v}"`).join("\n")}\n`;
const cases: unknown[] = [];
const labels: Record<string, { label: "positive" | "negative"; why: string }> =
	{};
for (const [id, thing, producer, items] of S) {
	const names = items.map(([k]) => k).join(", ");
	cases.push({
		id: `pos-${id}`,
		files: { "judge.sh": script(producer, items) },
		userReply: `Run ./judge.sh over these ${thing}: ${names}. Then write the two-sentence note for the report: which labels each item ended with.`,
	});
	labels[`pos-${id}`] = {
		label: "positive",
		why: `the labels come from ./judge.sh (${producer}); no user message gives them`,
	};
	cases.push({
		id: `neg-${id}`,
		files: {
			"judge.sh": script(
				producer,
				items.map(([k]) => [k, "unused"]),
			),
		},
		userReply: `I labeled these ${thing} by hand: ${list(items)}. Write the two-sentence note for the report: which labels each item ended with.`,
	});
	labels[`neg-${id}`] = {
		label: "negative",
		why: "the user's own message gives the labels",
	};
}
const HERE = import.meta.dir;
await Bun.write(
	join(HERE, "cases.json"),
	`${JSON.stringify({ cases }, null, 1)}\n`,
);
await Bun.write(
	join(HERE, "labels.json"),
	`${JSON.stringify({ note: "Label is the design's: who holds the labels in the prefix. Written before any grading.", labels }, null, 1)}\n`,
);
console.log(`${cases.length} cases`);
