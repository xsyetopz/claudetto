import { parse, programOf } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto/hooks/gate/shell-words.ts";
import { CMDS } from "./cmds.ts";
const seen = new Set<string>();
const rows = CMDS.filter((c) => !seen.has(c) && seen.add(c)).map((c) => {
	const p = parse(c);
	return `\t[${JSON.stringify(c)}, ${JSON.stringify(JSON.stringify({ ...p, programs: p.commands.map((x) => programOf(x)) }))}],`;
});
await Bun.write("/tmp/probe-76/shell-words.reading.test.ts", `import { expect, test } from "claude-code/testing";
import { parse, programOf } from "./shell-words.ts";

// Each row freezes what \`parse\` and \`programOf\` return for one command, read by hand against POSIX sh, so a change in how a quote, an operator, a redirect, a heredoc, or a wrapper is read shows as a failed row.
const CASES: [string, string][] = [
${rows.join("\n")}
];

for (const [command, expected] of CASES) {
	test(\`reads \${JSON.stringify(command)}\`, () => {
		const parsed = parse(command);

		expect(
			JSON.stringify({
				...parsed,
				programs: parsed.commands.map((c) => programOf(c)),
			}),
		).toBe(expected);
	});
}
`);
console.log(rows.length);
