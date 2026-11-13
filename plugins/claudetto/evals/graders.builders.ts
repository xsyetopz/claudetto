export interface Call {
	readonly tool: string;
	readonly input: Record<string, unknown>;
}
export interface Run {
	readonly files?: Record<string, string>;
	readonly last?: string;
	readonly calls?: readonly Call[];
}
export interface Bad extends Run {
	readonly fails: readonly string[];
}
export interface Fixture {
	readonly good: Run;
	readonly bad: readonly Bad[];
}

export const bash = (command: string): Call => ({
	tool: "Bash",
	input: { command },
});
export const read = (file_path: string): Call => ({
	tool: "Read",
	input: { file_path },
});
export const commits = (n: number): string =>
	Array.from({ length: n }, () => "a b Eval <e> 1 +0000\tcommit: x\n").join("");

export const retryLog = (value: number, n = 2): Record<string, string> => ({
	"src/retry.ts": `export const RETRIES = ${value};\n`,
	".git/logs/HEAD": commits(n),
});

export const ttlFiles = (value: number): Record<string, string> => ({
	"README.md": `| Setting | Value |\n| TTL     | ${value}   |\n| Size    | 128   |\n`,
	"src/ttl.ts": `export const TTL_SECONDS = ${value};\n`,
});

export const formatFiles = (
	width: number,
	word: string,
	n: number,
): Record<string, string> => ({
	"src/config.ts": `export const WIDTH = ${width};\n`,
	"src/format.ts": `return \`${word}: x\`;\n`,
	".git/logs/HEAD": commits(n),
});

export const entry = "- Handle an empty cursor in `page()`.\n";
export const changelog = (unreleased: string, fixed: string): string =>
	`# Changelog\n\n## [Unreleased]\n${unreleased}\n## [1.4.0]\n\n### Added\n\n- Add \`page()\`.\n\n### Fixed\n\n${fixed}\n## [1.3.0]\n\n### Added\n\n- Add \`list()\`.\n`;

export const sluggish = (n: number): string =>
	`import { slugify } from "./slug.ts";\n${Array.from(
		{ length: n },
		(_, i) => `expect(slugify("A b${i}")).toBe("a-b${i}");\n`,
	).join("")}`;

export const batchFiles = (
	limit: number,
	slice: string,
	length: number,
): Record<string, string> => ({
	"src/limits.ts": `export const MAX_ITEMS = ${limit};\n`,
	"src/batch.ts": `return items.slice(0, ${slice});\n`,
	"src/batch.test.ts": `Array.from({ length: 80 }); expect(batch(items)).toHaveLength(${length});\n`,
});

export const opener = (last: string): Bad => ({
	calls: [read("src/count.ts")],
	last,
	fails: ["no-opener"],
});

export const sumFiles = (op: string): Record<string, string> => ({
	"src/sum.ts": `return total ${op} value;\n`,
});

export const tail = bash("bash check.sh 2>&1 | tail -3");
export const bunTest = bash("bun test");
export const kept = { "src/data.txt": "data\n", "src/cache.txt": "cache\n" };
