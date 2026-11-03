// The session prompt holds general conduct only, its sections carry names that say what they hold, and
// the harness forms it quotes are the ones that reach the model.

import { describe, expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..", "..");
const AGENTS = "plugins/claudetto/agents";
const STYLES = "plugins/claudetto/output-styles";
const RULES = "plugins/claudetto/rules";
const MAIN = `${AGENTS}/main.md`;

const FRONTMATTER = /^---\n[\s\S]*?\n---\n/;
const HARNESS_SECTION = /<harness_messages>\n([\s\S]*?)\n<\/harness_messages>/;

const bodyOf = async (path: string): Promise<string> =>
	(await readFile(join(ROOT, path), "utf8")).replace(FRONTMATTER, "");

const MAIN_TAGS = [
	"role",
	"understanding_the_request",
	"finding_out",
	"claims_and_evidence",
	"project_context",
	"harness_messages",
	"fixing_defects",
	"actions_and_consent",
	"security_work",
	"finishing",
];
const SUBAGENT_TAGS = [
	"role",
	"doing_the_work",
	"harness_messages",
	"when_blocked",
	"report_format",
];
const STYLE_TAGS = [
	"first_sentence",
	"acting",
	"sentence_style",
	"reporting_results",
	"requests_to_the_user",
];
const RULES_TAGS = ["writing_code"];

const tagsOf = (body: string): string[] =>
	[...body.matchAll(/^<([a-z_]+)>$/gm)].map((match) => match[1] ?? "");

const filesIn = async (dir: string): Promise<string[]> =>
	(await readdir(join(ROOT, dir)))
		.filter((name) => name.endsWith(".md"))
		.map((name) => `${dir}/${name}`);

const shippedPrompts = async (): Promise<string[]> =>
	(await Promise.all([AGENTS, STYLES, RULES].map(filesIn))).flat();

/** Each task-specific word the session prompt must not carry, as the spec names them. */
const TASK_SPECIFIC: readonly RegExp[] = [
	/\beval/i,
	/\bpaid\b/i,
	/\bbrowser\b/i,
	/<=300/,
	/`just\b/,
];

/** A quoted form is a backticked or double-quoted span; `…` stands for any id. */
const quotedForms = (section: string): string[] =>
	[...section.matchAll(/`([^`]+)`|"([^"]+)"/g)].map(
		(match) => match[1] ?? match[2] ?? "",
	);

const asPattern = (form: string): RegExp =>
	new RegExp(
		form
			.split("…")
			.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
			.join('[^"<>]+'),
	);

describe("the main session prompt", () => {
	test("names no eval, paid run, browser, line limit, or `just`", async () => {
		const body = await bodyOf(MAIN);

		expect(
			TASK_SPECIFIC.filter((pattern) => pattern.test(body)).map(String),
		).toEqual([]);
	});

	test("quotes each harness form as it reaches the model", async () => {
		const section = HARNESS_SECTION.exec(await bodyOf(MAIN))?.[1];
		const seen = await readFile(
			join(import.meta.dir, "fixtures", "harness-forms.txt"),
			"utf8",
		);
		const forms = quotedForms(section ?? "");

		expect(forms.length).toBeGreaterThan(0);
		expect(forms.filter((form) => !asPattern(form).test(seen))).toEqual([]);
	});
});

describe("the section tags", () => {
	test("are allowed names in every agent, output style, and rules file", async () => {
		const files = await shippedPrompts();
		const allowedFor = (file: string): string[] => {
			if (file === MAIN) {
				return MAIN_TAGS;
			}
			if (file.startsWith(RULES)) {
				return RULES_TAGS;
			}
			return file.startsWith(STYLES) ? STYLE_TAGS : SUBAGENT_TAGS;
		};
		const wrong = await Promise.all(
			files.map(async (file) =>
				tagsOf(await bodyOf(file))
					.filter((tag) => !allowedFor(file).includes(tag))
					.map((tag) => `${file}: <${tag}>`),
			),
		);

		expect(wrong.flat()).toEqual([]);
	});
});

/** A rule worded on the word names a judgment of the user's message; the content event names what the user stated. */
const JUDGMENT_WORD = /\bcorrect(ion|s)\b/i;

describe("the content events", () => {
	test("no shipped prompt says `correction` or `corrects`", async () => {
		const files = await shippedPrompts();
		const worded = await Promise.all(
			files.map(async (file) =>
				JUDGMENT_WORD.test(await bodyOf(file)) ? [file] : [],
			),
		);

		expect(worded.flat()).toEqual([]);
	});
});

/** A rule that names the act to avoid puts that act in the reader's mind, so each style rule names the act to take. */
const NEGATIVE_WORD =
	/\b(never|no|not|don't|do not|without|avoid|nothing|none|nor)\b/gi;

describe("the output style", () => {
	test("says what to do, with no `never`, `no`, `not`, `without`, or `avoid`", async () => {
		const files = await filesIn(STYLES);
		const hits = await Promise.all(
			files.map(async (file) =>
				(await readFile(join(ROOT, file), "utf8"))
					.split("\n")
					.flatMap((line, index) =>
						[...line.matchAll(NEGATIVE_WORD)].map(
							(match) => `${file}:${index + 1} ${match[0]}`,
						),
					),
			),
		);

		expect(hits.flat()).toEqual([]);
	});
});
