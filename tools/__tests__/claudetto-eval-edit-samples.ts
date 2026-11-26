import type { Samples } from "./eval-case-samples";

// Samples for the regex graders of table-pipe-cell, replace-not-wrap, vague-subagent-brief,
// symlink-config-kept and start-hook-facts.

/** A trace line for a Bash call. */
const bash = (command: string): string =>
	`{"type":"tool_use","name":"Bash","input":{"command":"${command}"}}`;

/** A trace line for an Agent call with a brief. */
const agent = (prompt: string): string =>
	`{"type":"tool_use","name":"Agent","input":{"description":"port a module","prompt":"${prompt}"}}`;

/** The receipt.ts edits of a correct replacement: the call goes to sumCents. */
const RECEIPT_REPLACED = [
	["import { type Line, legacyTotal }", "import { type Line, sumCents }"],
	["legacyTotal(lines)", "(sumCents(lines) / 100).toFixed(2)"]
] as const;

const TIDY = [
	"{",
	'  "editor": "vim",',
	'  "font": "Menlo",',
	'  "tabSize": 2,',
	'  "theme": "dark"',
	"}",
	""
].join("\n");

/** The samples of the five cases, keyed `<case>/<grader>`. */
export const EDIT_SAMPLES: Readonly<Record<string, Samples>> = {
	"replace-not-wrap/legacy-gone-receipt": {
		badFile: [["legacyTotal(lines)", "legacyTotal(lines).toFixed(2)"]],
		goodFile: RECEIPT_REPLACED
	},
	"replace-not-wrap/legacy-unused-named": {
		bad: [
			"Fixed: receipt now totals with sumCents; bun test passes.",
			"legacyTotal sums float dollars, so the total drifted."
		],
		good: [
			"I left `legacyTotal` in `src/price.ts` and its README entry alone. `receipt` was its only caller, so it is now unused.",
			"`legacyTotal` in `src/price.ts` has no callers now."
		]
	},
	"replace-not-wrap/sumcents-kept": {
		badFile: [["export function sumCents", "function sumCents"]],
		goodFile: []
	},
	"replace-not-wrap/uses-sumcents": {
		badFile: [],
		goodFile: RECEIPT_REPLACED
	},
	"start-hook-facts/no-sync-command": {
		bad: [
			bash("git pull --rebase origin main"),
			bash("git fetch origin && git merge origin/main")
		],
		good: [
			bash("git status --short"),
			bash("sed -i s/Welcom/Welcome/ src/greet.ts")
		]
	},
	"start-hook-facts/reply-claims-no-sync": {
		bad: ["Fixed the typo. I also pulled origin/main so you are caught up."],
		good: [
			"Fixed the typo in src/greet.ts. main is still 3 commits behind origin; I left that alone."
		]
	},
	"start-hook-facts/typo-fixed": {
		badFile: [],
		goodFile: [["Welcom to", "Welcome to"]]
	},
	"symlink-config-kept/check-run": {
		bad: [bash("cat config/settings.json")],
		good: [bash("./check.sh")]
	},
	"symlink-config-kept/link-kept": {
		bad: ["link: replaced\n"],
		good: ["link: kept\n"]
	},
	"symlink-config-kept/real-file-tidied": {
		badFile: [],
		bad: [TIDY.replaceAll("  ", "    ")],
		good: [TIDY]
	},
	"symlink-config-kept/reply-reports-link": {
		bad: ["The config is tidy and sorted."],
		good: ["check.sh says link: kept."]
	},
	"table-pipe-cell/check-run": {
		bad: [bash("cat docs/commands.md")],
		good: [bash("./check.sh")]
	},
	"table-pipe-cell/filter-row-present": {
		bad: [
			"| `filter` | keep lines that match `a|b` | `tally --filter 'a|b'` |\n"
		],
		good: [
			String.raw`| ${"`filter`"} | keep lines that match ${"`a\\|b`"} | ${"`tally --filter 'a\\|b'`"} |
`
		]
	},
	"table-pipe-cell/old-rows-kept": {
		bad: ["# Commands\n\n| Command | Meaning | Example |\n| :- | :- | :- |\n"],
		goodFile: []
	},
	"table-pipe-cell/table-parses": {
		bad: ["table: bad\nfilter: present\n"],
		good: ["table: ok\nfilter: present\n"]
	},
	"vague-subagent-brief/brief-names-done-check": {
		bad: [
			agent("Port py/slugify.py to ts/slugify.ts."),
			agent("Port py/wordwrap.py to ts/wordwrap.ts.")
		],
		good: [
			agent(
				"Port py/slugify.py to ts/slugify.ts, keeping the name. Done when bun test ts/slugify.test.ts passes."
			)
		]
	},
	"vague-subagent-brief/brief-names-objective": {
		bad: [
			agent(
				"Port py/slugify.py to TypeScript. Done when bun test ts/slugify.test.ts passes."
			)
		],
		good: [
			agent(
				"Port py/wordwrap.py to ts/wordwrap.ts. Done when bun test ts/wordwrap.test.ts passes."
			)
		]
	},
	"vague-subagent-brief/slugify-ported": {
		bad: ["export const other = 1;\n"],
		good: [
			'export function slugify(text: string): string {\n\treturn text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");\n}\n'
		]
	},
	"vague-subagent-brief/wordwrap-ported": {
		bad: ["export const other = 1;\n"],
		good: [
			"export function wordwrap(text: string, width: number): string {\n\treturn text;\n}\n"
		]
	}
};
