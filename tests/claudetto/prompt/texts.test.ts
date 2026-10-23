// Design D7 (task 7.3): a claudetto text that Claude reads says what to do, and holds no rule in the form "do not X".
// A lint test fails on a modal with `not`, `never`, `cannot`, and a `n't` contraction, in any case, and on `NOT` in capitals, in an agent body, a skill, the output style, a hook message of a slice (`prompts.ts`), and a tool text.
// Quoted text (a span in backticks or double quotes) is out of scope, and so are the docs and the wiki (`AskUserQuestion` answer, 2026-10-23).
//
// Design D7 (task 7.3): a claudetto text is not longer than the default text that it replaces.
// `fixtures/text-defaults-2.1.309.json` holds the default text of each surface, which `bun tools/text-defaults.ts` captures,
// and `research/text-audit.md` lists the behavior lines of each one.

import { expect, test } from "bun:test";
import path from "node:path";
import { planModeText } from "../../../plugins/claudetto/slices/prompt/domain/plan-mode.ts";
import { TOOL_TEXTS } from "../../../plugins/claudetto/slices/prompt/domain/tools.ts";
import { PRECOMPACT_LINE } from "../../../plugins/claudetto/slices/prompt/prompts.ts";
import { MIN_CLAUDE_CODE_VERSION } from "../../../tools/limits.ts";
import { PLUGINS, REPO, walk } from "../../support/repo.ts";
import DEFAULTS from "./fixtures/text-defaults-2.1.309.json";

const CORE = path.join(PLUGINS, "claudetto");
const AUDIT = path.join(
  REPO,
  "openspec/changes/release-0-3-0-alpha-2/research/text-audit.md",
);

/** A negative-framed rule in any case: a modal with `not` (`do not`, `must not`), `never`, `cannot`, a `n't` contraction, and `NOT` in capitals. A state report such as `is not set` stays out. */
const NEGATIVE =
  /\b(?:(?:do|does|did|must|should|shall|may|can|will|would|could)\s+not|never|cannot)\b|\b\w+n't\b/i;
const NEGATIVE_UPPER = /\bNOT\b/;

/** The lines that stay out of the lint: the exact text of a line, by file relative to `plugins/claudetto/`. Each entry needs a reason. */
const ALLOW: Readonly<Record<string, readonly string[]>> = {};

/** `line` without its quoted spans: backticks and double quotes in Markdown, and escaped backticks in a TypeScript template. */
const unquoted = (line: string, markdown: boolean): string =>
  markdown
    ? line.replace(/`[^`]*`/g, "").replace(/"[^"]*"/g, "")
    : line.replace(/\\`.*?\\`/g, "");

/** Whether `line` holds a negative-framed rule. */
const negative = (line: string): boolean =>
  NEGATIVE.test(line) || NEGATIVE_UPPER.test(line);

/** The lines of `file` with a negative-framed rule, as `file:line: text`. */
const offenders = async (file: string): Promise<string[]> => {
  const rel = path.relative(CORE, file);
  const markdown = file.endsWith(".md");
  const out: string[] = [];
  (await Bun.file(file).text()).split("\n").forEach((line, i) => {
    if (!markdown && /^\s*(?:\/\/|\/?\*)/.test(line)) return;
    if (ALLOW[rel]?.includes(line)) return;
    if (negative(unquoted(line, markdown)))
      out.push(`${rel}:${i + 1}: ${line.trim()}`);
  });
  return out;
};

const files = (dir: string, keep: (f: string) => boolean): string[] =>
  walk(path.join(CORE, dir), { keep });

const GROUPS: Readonly<Record<string, () => string[]>> = {
  "agent bodies and descriptions": () =>
    files("agents", (f) => f.endsWith(".md")),
  "the output style": () => files("output-styles", (f) => f.endsWith(".md")),
  skills: () => files("skills", (f) => f.endsWith("SKILL.md")),
  "hook messages and tool texts (`prompts.ts` of each slice)": () =>
    files("slices", (f) => f.endsWith("/prompts.ts")),
};

test("the lint finds a negative rule, and leaves quoted text and a positive rule", () => {
  const hit = (line: string): boolean => negative(unquoted(line, true));
  expect(hit("Do not retry the call.")).toBe(true);
  expect(hit("Never edit the lock file.")).toBe(true);
  expect(hit("You don't need a plan.")).toBe(true);
  expect(hit("Run the check NOT the build.")).toBe(true);
  expect(hit("Do NOT retry the call.")).toBe(true);
  expect(hit("The call MUST NOT retry.")).toBe(true);
  expect(hit("The variable is not set.")).toBe(false);
  expect(hit("A tool that cannot run, or won't run.")).toBe(true);
  expect(hit('Say "do not push" to the user, as in `never force`.')).toBe(
    false,
  );
  expect(hit("Retry the call on the same path.")).toBe(false);
  expect(negative(unquoted("\\`never\\` is a word", false))).toBe(false);
});

for (const [group, list] of Object.entries(GROUPS)) {
  test(`Negative Rule: ${group} hold no negative-framed rule`, async () => {
    const found = (await Promise.all(list().map(offenders))).flat();
    expect(found, `negative-framed rules:\n${found.join("\n")}`).toStrictEqual(
      [],
    );
  });
}

// Design D7, requirement "Run the Free Check" (task 7.6): the old line let Claude propose a free check in place of running it.
const OLD_FREE_CHECK = "did not verify, with the command that verifies it";

test("Free Check: no surface and no eval case holds the old line of `Concise.md:18`", async () => {
  const surfaces = [
    ...Object.values(GROUPS).flatMap((list) => list()),
    ...files("evals", (f) => f.endsWith("case.yaml")),
  ];
  const found: string[] = [];
  for (const file of surfaces)
    if ((await Bun.file(file).text()).includes(OLD_FREE_CHECK))
      found.push(path.relative(CORE, file));
  expect(surfaces.length).toBeGreaterThan(40);
  expect(found).toStrictEqual([]);
});

const captured = DEFAULTS as Record<
  string,
  { text: string; page: string; offset: number | null }
>;

/** The text of a Markdown file without its front matter. */
const body = async (file: string): Promise<string> =>
  (await Bun.file(path.join(CORE, file)).text())
    .replace(/^---\n[\s\S]*?\n---\n/, "")
    .trim();

/** The surfaces that have a claudetto text today: the capture key, and the text that replaces the default. */
const SURFACES: Readonly<Record<string, () => Promise<string>>> = {
  main: () => body("agents/main.md"),
  style: () => body("output-styles/Concise.md"),
  "agent.worker": () => body("agents/Worker.md"),
  "agent.scout": () => body("agents/Scout.md"),
  "plan-mode": async () => planModeText(captured["plan-mode"]?.text ?? ""),
  compaction: async () => PRECOMPACT_LINE,
  ...Object.fromEntries(
    Object.keys(TOOL_TEXTS).map((tool) => [
      `tool.${tool}`,
      async () => TOOL_TEXTS[tool] as string,
    ]),
  ),
};

/** The surfaces that the capture holds and no hook can replace: `_rn` appends the subagent notes outside `prompt.compose` (task 11.4). */
const ENGINE_OWNED = ["subagent-notes"];

test("the capture holds each surface of D7 for the tested version", () => {
  expect(MIN_CLAUDE_CODE_VERSION).toBe("2.1.309");
  for (const key of [...Object.keys(SURFACES), ...ENGINE_OWNED]) {
    expect(captured[key]?.text.length, key).toBeGreaterThan(0);
    expect(captured[key]?.page, key).toStartWith("prompts/");
  }
});

test("`research/text-audit.md` has a section for each surface of the capture", async () => {
  const audit = await Bun.file(AUDIT).text();
  for (const key of [...Object.keys(SURFACES), ...ENGINE_OWNED])
    expect(audit, key).toContain(`\`${key}\``);
});

// `main` replaces the whole system prompt, so it has no default of the same text to compare with.
for (const [key, replacement] of Object.entries(SURFACES).filter(
  ([key]) => key !== "main",
)) {
  test(`Shorter Text: the claudetto text of \`${key}\` is not longer than its default`, async () => {
    const before = captured[key]?.text.length ?? 0;
    expect((await replacement()).length).toBeLessThanOrEqual(before);
  });
}
