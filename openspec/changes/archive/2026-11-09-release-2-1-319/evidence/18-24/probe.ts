import { join } from "node:path";

import { cli, type Row, type Study, type Task } from "../18-5/harness.ts";

const set = (await Bun.file(
	join(import.meta.dir, process.env.PROMPTS ?? "prompts.json"),
).json()) as {
	prompts: { id: string; kind: string; text: string }[];
	fillers: string[];
};
const FILLERS = set.fillers.map((f) => new RegExp(f, "gim"));

const files: Record<string, string> = {
	"package.json": '{"name":"app","version":"1.0.0","type":"module"}\n',
	"README.md":
		"# app\n\nParses `key=value` lines and prints them. Run `bun src/cli.ts file`.\n",
	"src/parse.ts":
		'export const parse = (text: string): Record<string, string> => {\n\tconst out: Record<string, string> = {};\n\tfor (const line of text.split("\\n")) {\n\t\tconst i = line.indexOf("=");\n\t\tif (i > 0) {\n\t\t\tout[line.slice(0, i)] = line.slice(i + 1);\n\t\t}\n\t}\n\treturn out;\n};\n',
	"src/format.ts":
		'export const format = (o: Record<string, string>): string => Object.entries(o).map(([k, v]) => `${k}: ${v}`).join("\\n");\n',
	"src/cli.ts":
		'import { readFileSync } from "node:fs";\nimport { format } from "./format.ts";\nimport { parse } from "./parse.ts";\n\nconsole.log(format(parse(readFileSync(process.argv[2] ?? "", "utf8"))));\n',
};

const tasks: Task[] = set.prompts.map((p) => ({
	name: `${p.id}-${p.kind}`,
	files,
	prompt: p.text,
	dry: () => ({ name: "Read", input: { file_path: "README.md" } }),
}));

// Own Flesch-Kincaid grade: 0.39 * words/sentences + 11.8 * syllables/words - 15.59.
const syllables = (w: string): number => {
	const t = w
		.toLowerCase()
		.replace(/[^a-z]/g, "")
		.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
		.replace(/^y/, "");
	return Math.max(1, (t.match(/[aeiouy]{1,2}/g) ?? []).length);
};
export const prose = (text: string): string =>
	text
		.replace(/```[\s\S]*?```/g, " ")
		.replace(/`[^`]*`/g, " ")
		.replace(/^\s*\|.*$/gm, " ")
		.replace(/^#+\s*/gm, "")
		.replace(/[*_>]/g, "");
export const grade = (
	text: string,
): { words: number; sentences: number; syl: number } => {
	const t = prose(text);
	const words = t.match(/[A-Za-z][A-Za-z'-]*/g) ?? [];
	const sentences = t
		.split(/[.!?]+(?:\s|$)|\n\s*\n|\n\s*(?:[-*]|\d+[.)])\s/)
		.filter((s) => /[A-Za-z]/.test(s)).length;
	return {
		words: words.length,
		sentences: Math.max(1, sentences),
		syl: words.reduce((n, w) => n + syllables(w), 0),
	};
};
const fk = (g: { words: number; sentences: number; syl: number }): number =>
	0.39 * (g.words / g.sentences) + 11.8 * (g.syl / g.words) - 15.59;
const hits = (text: string): number =>
	FILLERS.reduce((n, r) => n + (text.match(r)?.length ?? 0), 0);

const study: Study = {
	probe: process.env.PROBE ?? "probe-18-24",
	root: process.env.ROOT ?? "/tmp/probe-18-24",
	arms: [
		{ name: "base", plugin: false },
		{
			name: "plugin",
			plugin: true,
			settings: { outputStyle: "claudetto:Concise" },
		},
	],
	tasks,
	score: (reply) => {
		const msgs = reply.toolCalls.flatMap((c) => {
			const i = c.input as Record<string, unknown>;
			const t =
				c.name === "Agent" || c.name === "Task"
					? i.prompt
					: c.name === "SendMessage"
						? i.message
						: undefined;
			return typeof t === "string" ? [t] : [];
		});
		const text = reply.segments.map((s) => s.text).join("\n\n");
		const g = grade(text);
		return {
			msgs: msgs.length,
			msgChars: msgs.reduce((n, m) => n + m.length, 0),
			words: g.words,
			sentences: g.words === 0 ? 0 : g.sentences,
			syl: g.syl,
			fillerReply: hits(prose(text)),
			fillerMsgs: msgs.reduce((n, m) => n + hits(m), 0),
		};
	},
};

const report = (rows: Row[], arms: string[]): string[] =>
	arms.map((a) => {
		const r = rows.filter((x) => x.arm === a);
		const sum = (k: string): number => r.reduce((s, x) => s + (x.m[k] ?? 0), 0);
		const withText = r.filter((x) => (x.m.words ?? 0) > 0);
		const perSession = withText.map((x) =>
			fk({
				words: x.m.words as number,
				sentences: x.m.sentences as number,
				syl: x.m.syl as number,
			}),
		);
		const pooled = fk({
			words: sum("words"),
			sentences: sum("sentences"),
			syl: sum("syl"),
		});
		return `${a}\tsessions ${r.length}\tmessages ${sum("msgs")}\tmean chars ${(sum("msgChars") / Math.max(1, sum("msgs"))).toFixed(1)}\tFK mean of sessions ${(perSession.reduce((s, v) => s + v, 0) / Math.max(1, perSession.length)).toFixed(2)} (n ${perSession.length})\tFK pooled ${pooled.toFixed(2)}\tfiller reply ${sum("fillerReply")} msgs ${sum("fillerMsgs")} total ${sum("fillerReply") + sum("fillerMsgs")}\tcapped ${r.filter((x) => x.capped).length}\ttokens ${sum("tokens") || r.reduce((s, x) => s + x.tokens, 0)}\t$${r.reduce((s, x) => s + x.usd, 0).toFixed(4)}\tlargest ${Math.max(0, ...r.map((x) => x.tokens))}`;
	});

await cli(study, report);
