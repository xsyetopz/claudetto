import { GENERATED } from "./rules.generated.ts";
import { type Command, programOf } from "./shell-words.ts";
import { ask, deny, type Verdict } from "./verdict.ts";

interface Filter {
	type: string;
	value: string;
}
interface Rule {
	id: string;
	decision: "deny" | "ask";
	description: string;
	feed: "raw" | "parsed";
	regex: string;
	flags: string;
	filters: readonly Filter[];
}

const BARE = /^[^\s'"\\]+$/;
const quote = (word: string): string =>
	BARE.test(word) ? word : `'${word.replaceAll("'", "'\\''")}'`;

const rules: {
	rule: Rule;
	test: RegExp;
	filters: (text: string) => boolean;
}[] = GENERATED.rules.map((rule: Rule) => {
	const filters = rule.filters.flatMap((f) =>
		f.type === "PathExists"
			? []
			: [{ wanted: f.type === "Matches", test: new RegExp(String(f.value)) }],
	);
	return {
		rule,
		test: new RegExp(rule.regex, rule.flags),
		filters: (text) => filters.every((f) => f.test.test(text) === f.wanted),
	};
});

// Options that go between `git` and its verb and take the next word as their value.
const GIT_VALUED = new Set([
	"-C",
	"-c",
	"--git-dir",
	"--work-tree",
	"--namespace",
	"--super-prefix",
	"--config-env",
]);

/** The words of a `git` command without the options before its verb, so `git -C dir reset --hard` reads as `git reset --hard`. */
export const withoutGitOptions = (args: string[]): string[] => {
	let i = 0;
	while (i < args.length && (args[i] ?? "").startsWith("-")) {
		i += GIT_VALUED.has(args[i] ?? "") ? 2 : 1;
	}
	return args.slice(i);
};

const asText = (words: string[], redirects: Command["redirects"]): string =>
	[
		...words.map(quote),
		...redirects.map((r) => `${r.op} ${quote(r.target)}`),
	].join(" ");

/** The texts the rules read for one command: wrappers such as `sudo` dropped, words re-quoted, redirects appended. After `--` a word that starts with `-` is an operand, so it gets a `./` and no longer reads as a flag. A `git` command is read twice, as written and without its options before the verb. */
export const parsedTexts = (c: Command): string[] => {
	const { name, args } = programOf(c);
	const end = args.indexOf("--");
	const words = args.map((w, i) =>
		end >= 0 && i > end && w.startsWith("-") ? `./${w}` : w,
	);
	return [
		asText([name, ...words], c.redirects),
		...(name === "git"
			? [asText(["git", ...withoutGitOptions(words)], c.redirects)]
			: []),
	];
};

const hits = (text: string, feed: Rule["feed"]): Rule[] =>
	rules
		.filter(
			({ rule, test, filters }) =>
				rule.feed === feed && test.test(text) && filters(text),
		)
		.map(({ rule }) => rule);

/** The rule ids that match a command line: `raw` rules read the whole text, `parsed` rules read each command of it. */
export const ruleHits = (raw: string, commands: Command[]): Rule[] => [
	...hits(raw, "raw"),
	...commands.flatMap((c) => parsedTexts(c).flatMap((t) => hits(t, "parsed"))),
];

/** The strictest verdict of the vendored rules, naming the rule and what it says. */
export const upstreamVerdict = (
	raw: string,
	commands: Command[],
): Verdict | undefined => {
	const found = ruleHits(raw, commands);
	const rule = found.find((r) => r.decision === "deny") ?? found[0];
	return (
		rule &&
		(rule.decision === "deny" ? deny : ask)(`${rule.id}: ${rule.description}`)
	);
};
