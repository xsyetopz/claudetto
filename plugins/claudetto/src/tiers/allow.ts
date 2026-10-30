export const ALLOW_RULES: readonly string[] = [
	"Bash(git status *)",
	"Bash(git diff)",
	"Bash(git log)",
	"Bash(git show)",
];

const NO_WRITE_FLAG: readonly string[] = ["git status"];

const RULE = /^([^(]*?)(?:\((.*)\))?$/s;
const ONLY_WILDCARDS = /^[*\s]*$/;
const SPACES = /\s+/;
const WILDCARD_TAIL = /[\s*]*\*[\s*]*$/;

export const broadRules = (rules: readonly string[]): readonly string[] =>
	rules.filter((rule) => {
		const [, tool = "", content] = RULE.exec(rule.trim()) ?? [];
		if (content === undefined || ONLY_WILDCARDS.test(content)) {
			return true;
		}
		return (
			tool === "Bash" && (content.trim().split(SPACES)[0] ?? "").includes("*")
		);
	});

export const flagOpenRules = (rules: readonly string[]): readonly string[] =>
	rules.filter((rule) => {
		const [, tool = "", content] = RULE.exec(rule.trim()) ?? [];
		if (tool !== "Bash" || content === undefined || !content.includes("*")) {
			return false;
		}
		return !NO_WRITE_FLAG.includes(content.replace(WILDCARD_TAIL, "").trim());
	});

export const ruleFaults = (rules: readonly string[]): readonly string[] => {
	const broad = broadRules(rules);
	return [
		...broad.map((rule) => `broad allow rule \`${rule}\``),
		...flagOpenRules(rules)
			.filter((rule) => !broad.includes(rule))
			.map((rule) => `allow rule \`${rule}\` admits a file-writing flag`),
	];
};
